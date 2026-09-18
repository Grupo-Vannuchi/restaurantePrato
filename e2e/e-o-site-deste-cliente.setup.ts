import { expect, test as setup } from "@playwright/test";

import { siteConfig } from "@/config/site";
import { legalEntity } from "@/content/legal";
import { NOMES, rodaContraLocal } from "./semeia-cardapio";

/**
 * Confirma que o servidor medido é o site DESTE cliente, antes de qualquer
 * asserção rodar.
 *
 * ⚠️ **Este repositório é fork do site pronto de outro restaurante, e o fork
 * ainda roda nesta máquina.** Rotas, componentes, cabeçalho, rodapé, cardápio,
 * galeria e reservas são os mesmos — é o que se quis reaproveitar. O que difere
 * é dado de cliente.
 *
 * Então um servidor do projeto irmão responde a TODA rota que esta suíte visita,
 * com a mesma estrutura de DOM, e boa parte das asserções passa. Isso não
 * aparece no relatório: aparece como suíte verde, medida no site de outra
 * empresa. É a mesma família de defeito que este projeto vem fechando a semana
 * inteira — verde estando errado.
 *
 * Até 16/09 o caminho estava aberto: o `webServer` local subia em **3000** com
 * `reuseExistingServer`, e 3000 é onde o projeto irmão costuma estar. A porta
 * local saiu do 3000 no mesmo dia, mas a troca de porta não cobre o outro
 * caminho — `E2E_BASE_URL` apontado para o endereço errado, que é justamente
 * como se mira um site publicado. Esta confirmação cobre os dois.
 *
 * ⚠️ **A verificação é POSITIVA: exige as marcas deste cliente e nunca procura
 * as do anterior.** Reconhecer o vizinho exigiria escrever o nome dele num
 * arquivo do repositório, que é o que `test/brand-hygiene.test.ts` varre e
 * proíbe. Exigir o que é nosso dá a mesma proteção sem plantar o vestígio.
 *
 * ⚠️ **E os valores vêm de `siteConfig` e `legalEntity`, não copiados para cá.**
 * Uma terceira cópia do nome e do CNPJ passaria a afirmar um dado que ninguém
 * confere no dia em que a fonte mudar — mesma razão pela qual
 * `test/palette-contrast.test.ts` lê as cores da configuração em vez de trazer
 * os hexes.
 *
 * Falhando aqui, os dois projetos de navegador nem começam, porque dependem
 * deste. É o que se quer: medir o site errado é pior que não medir.
 */
/**
 * A causa mais provável quando o servidor responde mas a rota não.
 *
 * ⚠️ **Escrita na mensagem porque ela me custou a tarde de 16/09.** Eu
 * persegui instabilidade do servidor de desenvolvimento — 404 em rota pública,
 * erro de `JSON.parse` dentro do Next, aviso de hidratação — e cheguei a medir
 * dezesseis compilações em paralelo para provar que o servidor aguentava. Ele
 * aguenta: as dezesseis voltaram com o status certo.
 *
 * O que havia era servidor VELHO na porta. `reuseExistingServer` está ligado
 * fora do CI, então a suíte adota o que estiver lá — inclusive um processo meio
 * morto de uma execução anterior, que serve `/` e devolve 404 em todo o resto.
 * A mensagem padrão não diria isso, e sem isso escrito o próximo a ver este
 * 404 vai investigar o site.
 */
const DICA_DE_SERVIDOR_VELHO =
  "\n\n⚠️ Se o servidor foi reaproveitado de uma execução anterior, ele pode " +
  "estar meio morto: serve `/` e devolve 404 no resto. `reuseExistingServer` " +
  "está ligado fora do CI, então a suíte adota o que estiver na porta. " +
  "Derrube quem escuta a porta, apague `.next` com o servidor JÁ PARADO, e " +
  "rode de novo.";

setup("o servidor no ar é o site deste cliente", async ({ request }) => {
  /*
   * Duas marcas independentes, e cada uma cobre um furo da outra.
   *
   * O nome fantasia está no cabeçalho de toda página, mas é texto de marca —
   * alguém poderia servir uma página deste projeto com a marca ainda por
   * trocar. O CNPJ é registro: número único, atribuído a esta empresa, e ele só
   * existe nos documentos legais.
   */
  /*
   * ⚠️ **O tempo do teste tem de caber a insistência.** As esperas abaixo têm
   * 60 s cada, e o teste em volta herdava o limite padrão de 30 s do
   * Playwright: a espera morria pela metade, com "Test timeout of 30000ms
   * exceeded" empilhado em cima da mensagem que interessa. Mesmo descasamento
   * que `aquece.setup.ts` tinha entre requisição e teste, e a folga de fora é
   * sempre a que manda.
   */
  setup.setTimeout(150_000);

  /*
   * ⚠️ **Insiste no STATUS, e não na marca — e a diferença é o que separa uma
   * guarda de um obstáculo.**
   *
   * Identidade é propriedade estável: site errado não passa a ser o certo na
   * segunda tentativa, então insistir não pode mascarar o defeito que isto
   * existe para pegar. Já "a rota ainda não compilou" é transitório — o
   * servidor de desenvolvimento desta máquina devolveu 404 e 500 em rota
   * pública de forma intermitente durante a verificação de 16/09, com erro de
   * `JSON.parse` no próprio Next e aviso de hidratação. Sem insistir, esta
   * preparação viraria o gargalo que reprova a suíte inteira por instabilidade
   * de ambiente, que é justamente o que o aquecimento foi criado para acabar.
   *
   * Então: espera a rota responder, e aí exige a marca uma vez só.
   */
  await expect
    .poll(async () => (await request.get("/")).status(), {
      timeout: 60_000,
      message:
        "a home não respondeu 200: o servidor não está servindo o site" +
        DICA_DE_SERVIDOR_VELHO,
    })
    .toBe(200);
  expect(
    await (await request.get("/")).text(),
    "a home não traz o nome deste cliente: a suíte está apontada para outro site",
  ).toContain(siteConfig.name);

  await expect
    .poll(async () => (await request.get("/privacy")).status(), {
      timeout: 60_000,
      message:
        "/privacy não respondeu 200: sem ela não há como conferir o CNPJ" +
        DICA_DE_SERVIDOR_VELHO,
    })
    .toBe(200);
  expect(
    await (await request.get("/privacy")).text(),
    "o CNPJ publicado não é o deste cliente: a suíte está apontada para outro site",
  ).toContain(legalEntity.cnpj);
});

/**
 * E confirma que o servidor lê o BANCO que esta suíte semeia.
 *
 * ⚠️ **A verificação acima prova o site; esta prova o banco, e são coisas
 * diferentes.** O servidor pode ser o site deste cliente, na porta certa, com o
 * nome e o CNPJ certos, e estar lendo o Supabase de PRODUÇÃO.
 *
 * Como isso acontece sem ninguém pedir: `next build` e `next start` rodam com
 * `NODE_ENV=production`, e aí o Next carrega `.env.production.local` ANTES do
 * `.env`. Esse arquivo aponta para o Supabase do cliente. Quem sobe um build de
 * produção local para medir — o que é justamente o que se deve medir — recebe
 * um servidor `localhost` ligado ao banco de produção.
 *
 * ⚠️ **E o custo não é só medir errado.** `e2e/contact.spec.ts` ENVIA o
 * formulário: ele se pula sozinho quando `E2E_BASE_URL` está definida, porque a
 * premissa daquele guarda é "alvo localhost ⇒ banco local". É exatamente essa
 * premissa que o `.env.production.local` quebra. Em 18/09/2026 a suíte rodou
 * inteira contra um build de produção local e o spec de contato não se pulou —
 * o alvo era `localhost`. Já havia acontecido em 20/08, de outro jeito, e o
 * `contact.spec.ts` registrou a lição na íntegra: *"o aviso existia num
 * comentário do `playwright.config.ts`, e comentário não impede nada"*. O aviso
 * sobre este arquivo de ambiente também estava escrito lá, em 14/09, e eu passei
 * por ele duas vezes no mesmo dia atribuindo a falha à ordem de semeadura.
 *
 * Por isso a confirmação é aqui, onde ela PARA a suíte: os projetos de navegador
 * dependem desta preparação, então nada que escreva chega a rodar.
 *
 * A prova é a fixture do `globalSetup`, que é escrita via Prisma com o
 * `DATABASE_URL` do `.env` — o Docker local. Se ela não está na página servida,
 * o servidor está lendo outro banco. Não há palpite no meio: é a mesma fixture,
 * pelo mesmo nome, da mesma fonte.
 *
 * Contra site publicado a semeadura não roda (ver `rodaContraLocal`), e aí esta
 * confirmação se pula — senão ela reprovaria toda medição de produção.
 */
setup("o servidor lê o banco que a suíte semeia", async ({ request }) => {
  setup.setTimeout(150_000);
  setup.skip(
    !rodaContraLocal,
    "alvo publicado: o globalSetup não semeia, então não há fixture a exigir",
  );

  await expect
    .poll(async () => (await request.get("/cardapio")).status(), {
      timeout: 60_000,
      message: "/cardapio não respondeu 200" + DICA_DE_SERVIDOR_VELHO,
    })
    .toBe(200);

  expect(
    await (await request.get("/cardapio")).text(),
    "O cardápio servido não traz a fixture do `globalSetup`, então o servidor " +
      "NÃO está lendo o banco local.\n\n" +
      "Duas causas, nesta ordem de probabilidade:\n\n" +
      "1. Você reconstruiu DEPOIS de uma rodada anterior. O `globalTeardown` " +
      "apaga as fixtures ao fim de cada execução, então um build feito em " +
      "seguida congela `/cardapio` sem elas. Semeie de novo antes de construir " +
      "— e sim, toda vez.\n" +
      "2. `.env.production.local` aponta para o Supabase de produção, e " +
      "`next build`/`next start` o carregam ANTES do `.env`.\n\n" +
      "Construa e suba com o banco local explícito — e nesta ordem, com o " +
      "servidor parado antes de apagar o cache:\n" +
      "  DATABASE_URL=<local> npm run build\n" +
      "  DATABASE_URL=<local> npm run start -- --port 3200\n\n" +
      "⚠️ Enquanto isto reprova, NÃO force a suíte: `e2e/contact.spec.ts` " +
      "escreveria um contato de teste no banco do cliente.",
  ).toContain(NOMES.permanente);
});
