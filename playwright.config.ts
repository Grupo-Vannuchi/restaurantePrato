import { defineConfig, devices } from "@playwright/test";

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
 * ── ⚠️ `/cardapio` e `networkidle` no servidor de DESENVOLVIMENTO ─────────
 *
 * Contra `npm run dev`, os specs que abrem `/cardapio` com
 * `waitUntil: "networkidle"` estouram o tempo: três das oito fotos do
 * carrossel de massas ficam pendentes no navegador indefinidamente, e o estado
 * "sem rede" nunca chega. São sempre as mesmas três, e não é lentidão do
 * servidor — investigado em 11/09:
 *
 *   · pedidas por `curl`, uma a uma, respondem em ~80 ms
 *   · pedidas por `curl` em paralelo, as quatro respondem em menos de 200 ms
 *   · rolar o carrossel até elas entrarem em vista não as completa
 *   · o cache de imagem quente não muda nada
 *
 * É interação do Chromium com as conexões longas do servidor de
 * desenvolvimento (HMR), não defeito do site: contra um build de produção as
 * mesmas rotas passam. **A rodada que vale, depois de mexer em imagem ou em
 * layout, é contra `next build` + `next start`.**
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
 *   DATABASE_URL=… npx tsx -e "import s from './e2e/semeia-cardapio.ts'; await s()"
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
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
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
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["aquecimento"],
    },
    {
      name: "celular",
      use: { ...devices["Pixel 7"] },
      dependencies: ["aquecimento"],
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
        command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: process.env.CI ? 180_000 : 120_000,
      },
});
