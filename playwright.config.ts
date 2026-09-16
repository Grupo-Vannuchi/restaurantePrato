import { defineConfig, devices } from "@playwright/test";

/*
 * ⚠️ **A porta local NÃO é 3000, e a razão é grave: 3000 é, nesta máquina, o
 * projeto irmão — o fork de que este repositório nasceu, com as MESMAS rotas e
 * o mesmo DOM.** Com `reuseExistingServer`, a suíte reusava o servidor dele e
 * media o site de outro cliente, verde. O porquê inteiro, o motivo de a porta
 * do CI continuar 3000 e a razão de isto ser um módulo em vez de uma constante
 * local estão em `e2e/porta.ts`. A defesa que cobre também o `E2E_BASE_URL`
 * apontado para o lugar errado é `e2e/e-o-site-deste-cliente.setup.ts`.
 */
import { LOCAL, PORTA } from "./e2e/porta";

/**
 * E2E config. Local-first: runs the app via `npm run dev` (reusing a running
 * server if there is one) against the local DB and runs the specs in `e2e/`.
 * CI wiring (separate job) comes later.
 *
 * `E2E_BASE_URL` aponta a suíte para um site já publicado — o deploy da Vercel,
 * por exemplo — em vez de subir servidor nenhum. Serve de teste de fumaça pós
 * deploy: é o único jeito de exercitar o que está de fato no ar, com o banco,
 * o proxy e os cabeçalhos reais, e não uma cópia local que só se parece com ele.
 *
 * ⚠️ Contra um ambiente real, `contact.spec.ts` **escreve**: ele envia o
 * formulário e grava um lead de verdade. Rode-o assim só com a limpeza
 * combinada de antemão, ou selecione apenas os specs de leitura:
 *
 *   E2E_BASE_URL=https://… npx playwright test e2e/metadata-routes.spec.ts
 *
 * ── ⚠️ NUNCA apague `.next/cache/images` com o servidor NO AR ────────────
 *
 * Isso travou dezesseis testes do projeto `celular` em `/cardapio` durante uma
 * tarde inteira de 14/09, e cada hipótese que investiguei apontava para o site.
 * Nenhuma era. O dano vinha do procedimento de diagnóstico.
 *
 * O otimizador de imagem mantém estado sobre aquele diretório. Removido embaixo
 * de um `next start` vivo, a conversão de certas entradas **bloqueia para
 * sempre**: sem resposta, sem erro, sem uma linha no log. Como a marca do
 * cabeçalho é `priority`, o evento `load` da página nunca chegava — e com ele
 * foram todos os testes daquela rota, nenhum deles medindo imagem.
 *
 * O que fez parecer defeito do site, e não é:
 *
 *   · determinístico por (arquivo, largura) — eram as entradas cujo diretório
 *     eu havia destruído; `logo-claro.png` travava em 384 e 1080 e respondia em
 *     128 e 256, três vezes de três
 *   · `logo.png`, idêntica em dimensão, canais, profundidade e alfa, passava
 *   · o `sharp` sozinho converte TODAS as combinações em menos de 1,3 s
 *   · em WebP a mesma conversão volta em 58 ms; só o caminho AVIF travava
 *
 * Com o cache removido enquanto o servidor estava PARADO, as mesmas duas
 * conversões voltam em 209 ms e 219 ms, e a suíte fecha em **235 passando, 0
 * falhando, 6 puladas**.
 *
 * **A ordem certa é parar, apagar, subir.** É a mesma disciplina que a ordem de
 * semeadura abaixo, e pela mesma razão: `next start` lê o `.next` no boot e não
 * espera que ele mude embaixo dele.
 *
 * ⚠️ Havia aqui, escrito em 11/09, que os estouros eram interação do Chromium
 * com o servidor de desenvolvimento e que "contra um build de produção as
 * mesmas rotas passam". Era falso nas duas metades.
 *
 * ⚠️ E construa com o banco LOCAL e o `.next` limpo. `next build` carrega
 * `.env.production.local`, que aponta para o Supabase de produção — sem passar
 * `DATABASE_URL`, as páginas são prerenderizadas com os dados de PRODUÇÃO, e a
 * semeadura do `globalSetup`, que escreve no banco local, não aparece. E sem
 * apagar `.next` o `unstable_cache` devolve o conteúdo da build anterior.
 *
 * ── ⚠️ A ORDEM, que é o que sobra de errado quando tudo acima está certo ──
 *
 * Semear → construir → subir → rodar. Nessa ordem, e não em outra.
 *
 * O `globalSetup` semeia antes do `webServer`, e é assim que o CI acerta: a
 * semeadura acontece, DEPOIS o build prerenderiza `/cardapio`, e a página
 * congelada já traz os pratos de teste. Subindo o servidor à mão, a ordem
 * inverte: o build congela `/cardapio` sem eles, e a semeadura do `globalSetup`
 * chega tarde — a página servida é a de antes.
 *
 * O sintoma são as duas asserções de `cardapio-com-conteudo.spec.ts` falhando
 * com "o prato semeado não apareceu", e as outras quatro do mesmo arquivo
 * pulando atrás delas, porque o describe é `serial`. Aconteceu em 11/09 e de
 * novo em 14/09 antes de isto ficar escrito; a mensagem de falha já dizia a
 * causa, e eu tratei como limitação do procedimento em vez de passo faltando.
 *
 * Semeando antes do build, medido em 14/09: **231 passando, 0 falhando, 6
 * puladas** — e as seis são condicionais declaradas (o spec que escreve no
 * banco, o menu que só existe no celular, o suspenso que só existe no desktop).
 *
 * Para semear à mão, o `globalSetup` é um módulo com exportação padrão:
 *
 *   DATABASE_URL=… npx tsx -e "import('./e2e/semeia-cardapio.ts').then((m) => (typeof m.default === 'function' ? m.default : m.default.default)())"
 *
 * ⚠️ O comando é feio por interoperabilidade, e a versão curta NÃO roda: `tsx -e`
 * transpila para CJS, onde `await` de topo morre com "Top-level await is
 * currently not supported with the cjs output format", e o `default` chega
 * embrulhado em outro `default`. A forma acima está verificada — semeia as duas
 * categorias de teste.
 */
export default defineConfig({
  testDir: "./e2e",
  /*
   * Semeia o cardápio ANTES do servidor subir, e limpa no fim.
   *
   * ⚠️ A ordem é o ponto. No CI o `webServer` faz `npm run build`, que
   * PRÉ-RENDERIZA `/cardapio`: se a semeadura acontecesse dentro do teste, o
   * build já teria congelado a página com o banco vazio e a suíte exercitaria
   * um estado vazio achando que exercitava conteúdo. `globalSetup` corre antes
   * do `webServer`; um `beforeAll` de spec, não.
   *
   * A semeadura só age contra servidor local — ver `e2e/semeia-cardapio.ts`.
   */
  globalSetup: "./e2e/semeia-cardapio.ts",
  globalTeardown: "./e2e/limpa-cardapio.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "html" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? LOCAL,
    // Force the browser locale so next-intl serves Portuguese (default,
    // unprefixed) instead of redirecting to /en.
    locale: "pt-BR",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  /*
   * ⚠️ Dois projetos, e o de celular não é luxo.
   *
   * A suíte rodava só em `Desktop Chrome`, e todo o bloco `md:hidden` do
   * cabeçalho — o menu inteiro de quem entra pelo telefone — nunca foi
   * exercitado por teste nenhum, e2e ou unitário. Num site de restaurante é de
   * celular que a maioria chega.
   *
   * Os defeitos que esta linha encontrou de cara estão em
   * `e2e/menu-do-celular.spec.ts`.
   */
  projects: [
    /*
     * Aquecimento: roda ANTES dos dois navegadores, depois de o servidor subir.
     *
     * ⚠️ Ele existe porque o servidor de desenvolvimento compila cada rota na
     * primeira visita — a home levava 9,78 s medidos, contra 5 s de tempo
     * padrão de asserção. O primeiro teste a tocar cada rota pagava essa conta
     * e falhava, num teste diferente a cada execução. Os números e o
     * diagnóstico estão em `e2e/aquece.setup.ts`.
     *
     * `dependencies` é o que garante a ordem: `globalSetup` corre antes do
     * `webServer` e portanto não poderia aquecer nada (não há servidor ainda).
     * Um projeto de dependência corre depois.
     *
     * Ele não é apanhado pelos projetos de navegador porque o `testMatch`
     * padrão do Playwright só casa `*.spec.ts` e `*.test.ts`.
     */
    { name: "aquecimento", testMatch: /aquece\.setup\.ts$/ },
    /*
     * ⚠️ **Projeto próprio, e DEPOIS do aquecimento — não junto com ele.**
     *
     * A confirmação de identidade começou dentro do projeto de aquecimento, e
     * com `fullyParallel` as duas preparações corriam ao mesmo tempo. Ela
     * confere o CNPJ em `/privacy`, que o aquecimento ainda não havia
     * compilado, e reprovava de forma INTERMITENTE — por tempo, não por
     * identidade. Guarda que falha às vezes é pior que guarda nenhuma: ensina
     * quem depura a reexecutar até ficar verde.
     *
     * Encadeado — aquecer, confirmar, então asseverar — o resultado é
     * determinístico. E os dois navegadores dependem DESTE projeto, não do
     * aquecimento: reprovando a identidade, nenhuma asserção roda contra o
     * site errado (verificado: "10 did not run").
     */
    {
      name: "identidade",
      testMatch: /e-o-site-deste-cliente\.setup\.ts$/,
      dependencies: ["aquecimento"],
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["identidade"],
    },
    {
      name: "celular",
      use: { ...devices["Pixel 7"] },
      dependencies: ["identidade"],
    },
  ],
  // Sem servidor local quando a suíte mira um site publicado: subir um seria
  // desperdício e, pior, mascararia uma falha do deploy com um build local que
  // funciona.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Locally: the dev server (fast, reused if already running). In CI: a
        // real production build + start, which is what E2E should exercise.
        command: process.env.CI
          ? `npm run build && npm run start -- --port ${PORTA}`
          : `npm run dev -- --port ${PORTA}`,
        url: LOCAL,
        reuseExistingServer: !process.env.CI,
        timeout: process.env.CI ? 180_000 : 120_000,
      },
});
