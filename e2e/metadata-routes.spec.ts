import { test, expect } from "@playwright/test";

/**
 * As rotas de metadata respondem, e o que a página PUBLICA é o que existe.
 *
 * ── O defeito original: o proxy de locale engolia as rotas sem ponto ───────
 *
 * O matcher de `src/proxy.ts` isenta `api`, `_next`, `_vercel` e qualquer path
 * com ponto (`.*\..*`). `/icon` e `/apple-icon` não tinham ponto — então o
 * next-intl processava as duas e reescrevia para `/pt/icon`, que não existia:
 * os arquivos de ícone vivem na raiz de `src/app/`, fora de `[locale]/`. O
 * `<link rel="icon">` saía no HTML apontando para uma URL 404 e a aba do
 * navegador ficava sem a logo. O que tornava o bug invisível é o contraste: as
 * rotas COM extensão sempre funcionaram, porque o ponto já as tirava do matcher.
 *
 * ── O defeito que esta guarda não pegou, e por que ela mudou de forma ──────
 *
 * Em 09/09/2026 os três geradores `ImageResponse` viraram arquivo estático, e a
 * lista de caminhos escrita à mão aqui envelheceu no mesmo dia. `/icon` e
 * `/apple-icon` passaram a ser `/icon.png` e `/apple-icon.png` — o site
 * continuou certo, o teste é que pedia URL que não existe mais.
 *
 * Mas o terceiro caso não era teste velho: era o site quebrado. O gerador
 * respondia em `/opengraph-image`, sem ponto, e o proxy o reescrevia para
 * `/pt/opengraph-image` — ficar dentro de `[locale]/` era o que o fazia
 * funcionar, e havia até um comentário aqui explicando isso. O arquivo estático
 * criou uma rota COM ponto, que o matcher isenta de propósito: sem reescrita,
 * `/opengraph-image` não alcança nada. **A prévia de compartilhamento ficou sem
 * imagem por dois dias e nada acusou** — build verde, página 200, e o
 * `og:image` apontando para um 404.
 *
 * Por isso a guarda deixou de conferir caminhos que alguém digitou aqui e passou
 * a **ler o que o HTML publica e buscar aquilo**. Um caminho escrito no teste
 * envelhece junto com o código; a URL que a página anuncia é, por definição, a
 * que o visitante e o robô do WhatsApp vão pedir.
 */

/**
 * As rotas com extensão, que o matcher sempre isentou. Continuam escritas à mão
 * porque são contrato público e estável: um robô pede `/robots.txt` nesse nome,
 * não no que a página disser.
 */
const rotasComExtensao = ["/manifest.webmanifest", "/robots.txt", "/sitemap.xml"];

for (const path of rotasComExtensao) {
  test(`serve ${path} sem passar pelo proxy de locale`, async ({ request }) => {
    const response = await request.get(path);

    expect(response.status()).toBe(200);
  });
}

/**
 * O que a home anuncia no `<head>`: ícone, ícone do iPhone e cartão de
 * compartilhamento. `tipo` é o que a resposta tem de ser — um 200 devolvendo
 * HTML seria a página 404 renderizada com status errado.
 */
const ANUNCIADAS = [
  {
    nome: "o ícone da aba",
    seletor: 'link[rel="icon"]',
    atributo: "href",
    tipo: "image/",
  },
  {
    nome: "o ícone do iPhone",
    seletor: 'link[rel="apple-touch-icon"]',
    atributo: "href",
    tipo: "image/",
  },
  {
    nome: "a imagem do cartão de compartilhamento",
    seletor: 'meta[property="og:image"]',
    atributo: "content",
    tipo: "image/",
  },
];

for (const { nome, seletor, atributo, tipo } of ANUNCIADAS) {
  test(`${nome} aponta para algo que existe`, async ({ page, request, baseURL }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const anunciado = await page.locator(seletor).first().getAttribute(atributo);

    // Sentinela: sem a tag no HTML não há nada para buscar, e um teste que
    // busca `null` passaria calado. Foi exatamente assim que o cartão de
    // compartilhamento poderia ter sumido sem ninguém ver.
    expect(
      anunciado,
      `${nome} não está no <head> da home (${seletor} sem ${atributo}). Se a tag ` +
        `desapareceu, olhe o merge de metadata: o \`openGraph\` de um segmento ` +
        `SUBSTITUI o do pai inteiro, então a imagem anexada pela convenção de ` +
        `arquivo na raiz se perde — ver o aviso em src/lib/seo.ts.`,
    ).not.toBeNull();

    /*
     * A URL anunciada é absoluta e montada com `NEXT_PUBLIC_SITE_URL`, que no
     * ambiente local aponta para a porta padrão — e a suíte pode estar rodando
     * noutra porta, ou contra o site publicado. Só a ORIGEM é trocada pela do
     * teste; o caminho é o que está sob julgamento e vai intacto.
     */
    const alvo = new URL(anunciado!, baseURL);
    const daSuite = new URL(baseURL!);
    alvo.protocol = daSuite.protocol;
    alvo.host = daSuite.host;

    const resposta = await request.get(alvo.toString());

    expect(
      resposta.status(),
      `${nome} aponta para ${anunciado}, que respondeu ${resposta.status()}. ` +
        `Causa provável: o arquivo mudou de extensão ou de segmento. Rota de ` +
        `arquivo estático tem ponto e o matcher de src/proxy.ts isenta caminhos ` +
        `com ponto, então ela NÃO pode viver dentro de [locale]/ — sem a ` +
        `reescrita do next-intl, a URL sem prefixo não casa com nada.`,
    ).toBe(200);

    expect(
      resposta.headers()["content-type"],
      `${nome} respondeu 200 mas com tipo "${resposta.headers()["content-type"]}". ` +
        `HTML aqui é a página 404 devolvida com status errado.`,
    ).toContain(tipo);
  });
}
