import { expect, test } from "@playwright/test";

/**
 * Orçamento de desempenho — medido no site publicado, não numa cópia local.
 *
 * Em 20/08/2026 as páginas carregavam com LCP de 224–316 ms e **zero**
 * requisições a terceiros. Isso não é mérito de otimização: é o estado de um
 * site sem foto nenhuma. O valor deste teste é o dia em que as fotos entrarem,
 * quando ninguém vai estar medindo.
 *
 * Os limites são folgados de propósito: falha aqui deve significar regressão
 * de verdade, não uma rede lenta no meio da tarde.
 */

const LIMITE_LCP_MS = 2500; // limiar "bom" do Core Web Vitals

/*
 * ⚠️ Contra um servidor de desenvolvimento estes números não medem nada.
 *
 * `next dev` compila sob demanda e não minifica: o LCP que ele produz é o custo
 * da ferramenta, não o que chega ao visitante. Medido em 27/08/2026 no projeto
 * `celular`, a antiga `/gastronomia` deu **2820 ms e 3172 ms** no `next dev`
 * local e
 * passou folgado no site publicado, na mesma máquina, no mesmo minuto.
 *
 * A alternativa seria afrouxar o limite até o dev passar — e aí o teste
 * deixaria de pegar a regressão de verdade que ele existe para pegar. Preferiu-
 * se não medir a medir errado.
 *
 * O pulo aparece como "skipped" no relatório do Playwright, com este motivo:
 * lacuna declarada, não silenciosa. Em CI o `webServer` sobe um build de
 * produção, então lá ele roda.
 */
const alvo = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ehServidorDeDesenvolvimento =
  /localhost|127\.0\.0\.1/.test(alvo) && !process.env.CI;

for (const path of ["/", "/cardapio", "/galeria"]) {
  test(`${path} pinta o maior elemento em menos de ${LIMITE_LCP_MS}ms`, async ({
    page,
  }) => {
    test.skip(
      ehServidorDeDesenvolvimento,
      "LCP contra `next dev` mede a ferramenta, não o site — aponte E2E_BASE_URL para o site publicado",
    );
    await page.goto(path, { waitUntil: "networkidle" });

    const lcp = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let maior = 0;
          new PerformanceObserver((lista) => {
            for (const entrada of lista.getEntries()) maior = entrada.startTime;
          }).observe({ type: "largest-contentful-paint", buffered: true });
          setTimeout(() => resolve(Math.round(maior)), 1000);
        }),
    );

    expect(lcp, `LCP de ${lcp}ms em ${path}`).toBeLessThan(LIMITE_LCP_MS);
  });
}

test("nenhuma requisição sai para terceiros", async ({ page, baseURL }) => {
  // O site serve as próprias fontes (`next/font`) e não carrega script de
  // ninguém. Além de rápido, isso é o que impede que um serviço externo veja
  // quem visitou a página do restaurante — e é fácil de perder de vista: basta
  // alguém colar um trecho de mapa, vídeo ou métrica.
  //
  // O mapa do rodapé é a única exceção, e é um iframe: ele carrega no próprio
  // contexto, não como requisição desta página.
  const externos = new Set<string>();

  // O host vem do `baseURL`, não de `page.url()`: quando a primeira requisição
  // sai, a página ainda é `about:blank`, e a comparação marcava o próprio site
  // como terceiro.
  const proprio = new URL(baseURL!).host;

  page.on("request", (request) => {
    const host = new URL(request.url()).host;
    if (host !== proprio && request.frame() === page.mainFrame()) {
      externos.add(host);
    }
  });

  await page.goto("/", { waitUntil: "networkidle" });

  expect([...externos], [...externos].join(", ")).toEqual([]);
});

/**
 * O catálogo do painel não viaja para o visitante.
 *
 * `NextIntlClientProvider` sem a prop `messages` serializa o catálogo INTEIRO
 * no payload de toda página. A namespace `admin` sozinha são ~12 KB de textos
 * de login, erros do Evolution e dicas de campo do cardápio — baixados por
 * quem só quer ver o cardápio, e de novo a cada navegação interna.
 *
 * Medido: tirá-la levou o HTML da home de 67.524 para 55.117 bytes (−18%).
 *
 * Este teste vive no navegador, e não numa varredura de código, porque o que
 * importa é o que o servidor ENTREGA — a prop pode existir e estar errada.
 */
for (const path of ["/", "/cardapio", "/contato"]) {
  test(`${path} não entrega o catálogo do painel ao visitante`, async ({
    request,
  }) => {
    const html = await (await request.get(path)).text();

    // Textos que só existem na namespace `admin` do catálogo.
    expect(html).not.toContain("Painel administrativo");
    expect(html).not.toContain("Não foi possível criar a instância");
  });
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  ORÇAMENTO DE IMAGEM
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Quanto de fotografia cada página manda para o celular de quem chega.
 *
 * **Por que peso, e não milissegundos.** O teste de LCP acima mede tempo, e
 * tempo não é portátil: medi a home em 3404 ms com 4G lento e CPU quatro vezes
 * mais lenta, mas contra `next start` em HTTP/1.1 numa máquina local. A Vercel
 * serve HTTP/2 atrás de CDN, onde a multiplexação muda o quadro inteiro. Levar
 * aquele número para um teste seria transformar uma medição de bancada em
 * afirmação sobre o visitante.
 *
 * Bytes de imagem, ao contrário, atravessam qualquer transporte: 381 KB são
 * 381 KB no HTTP/1.1, no HTTP/2 e no 5G. É o que dá para guardar honestamente.
 *
 * ⚠️ **Esta guarda já passou verde medindo o passado, e a causa não estava
 * nela.** Em 10/09 a galeria foi de 6 para 12 fotos e o orçamento seguiu
 * verde. A página servia OITO — o build reaproveitou o resultado em cache de
 * `unstable_cache`, e o roteiro de medição limpava só `.next/cache/images`, não
 * `.next/cache`. Medido com o cache inteiro apagado, a galeria pesava 1311 KB
 * no celular, contra um limite de 580 que ela dizia respeitar.
 *
 * A lição não é sobre esta guarda: **cache de consulta desatualizado faz toda
 * guarda dependente de conteúdo medir o passado**, e nenhuma delas tem como
 * saber. Ao medir peso ou contraste depois de mexer no banco, apagar `.next`
 * inteiro — não só as imagens.
 *
 * ⚠️ **A regressão que isto pega tem nome.** As fotos entraram em 03/09 e a
 * home passou de zero para QUATRO imagens: o hero mais três da prévia da
 * galeria. Acrescentar foto na galeria pelo painel deixa a HOME mais pesada, e
 * quem acrescenta não está olhando para a home.
 *
 * ⚠️ **O limite da home subiu de 350 para 430 KB em 09/09**, quando o topo
 * passou de um slide para três. Subir limite é o movimento suspeito por
 * excelência — o normal é ele estar frouxo escondendo desperdício —, então o
 * que justifica está medido: o LCP no celular ficou em 1660 ms contra 1628
 * antes, ou seja, não mudou. Os dois slides novos carregam DEPOIS da primeira
 * pintura, e o peso a mais não é pago por quem só olha a primeira tela.
 *
 * As três fotos mais pesadas da home continuam sendo as da prévia da galeria,
 * a 75 de qualidade, e não as do topo, que estão a 50 sob véu. Elas ficam onde
 * estão de propósito: foto de galeria aparece inteira, sem véu, e é conteúdo.
 *
 * Os números caíram em 04/09, depois de as duas aberturas passarem a
 * `quality={50}`: elas são fotografias sob véu de leitura, e a de 50 é
 * indistinguível da de 75 lado a lado — conferido em captura. O hero da home
 * foi de 141 para 49 KB e o LCP no celular, de 3288 para 1628 ms. Os limites
 * abaixo já refletem isso, e é por isso que são apertados: afrouxá-los
 * devolveria em silêncio o que essa medição comprou.
 *
 * ⚠️ **A home deixou de ter o celular como pior caso em 10/09**, e vale
 * entender por quê antes de mexer: a grade da galeria passou a duas colunas no
 * telefone, então a prévia da home pede meia largura ali e a largura inteira no
 * desktop de três colunas. O limite dela agora sai do desktop. Nas outras duas
 * o celular continua governando.
 *
 * Os limites saíam do CELULAR por padrão: ali as fotos costumam ocupar a
 * largura toda e o navegador pede o arquivo maior. A home dá
 * 328 KB no desktop contra 381 no celular; a galeria, 217 contra 483. Medir
 * pelo desktop deixaria passar mais de o dobro sem ninguém notar.
 *
 * São esses valores mais folga de um quinto. Apertados o
 * bastante para uma foto grande nova cair, folgados o bastante para não falhar
 * por recompressão. Ao estourar: reduzir a qualidade, reduzir o `sizes`, ou
 * mostrar menos fotos na prévia — nunca subir o número sem medir.
 */
const ORCAMENTO_DE_IMAGEM_KB: Record<string, number> = {
  "/": 320, // pior caso desktop: medido 258 KB · 3 slides do topo + 3 da prévia
  "/cardapio": 390, // celular: medido 318 KB · abertura + 8 no carrossel da ilha
  "/galeria": 600, // celular: medido 458 KB com vinte e duas fotos de comida
  /*
   * As três faixas de título que ganharam foto em 10/09, quando o ambiente saiu
   * da galeria. Entram aqui porque foto nova sem orçamento é peso que cresce
   * sem ninguém olhar — foi o que aconteceu com a home em 03/09.
   */
  "/reservas": 130, // celular: medido 98 KB
  "/experiencia": 220, // celular: medido 173 KB
  "/contato": 120, // celular: medido 90 KB
};

for (const [path, limite] of Object.entries(ORCAMENTO_DE_IMAGEM_KB)) {
  test(`${path} não passa de ${limite} KB de imagem`, async ({ page }) => {
    const bytesPorUrl = new Map<string, number>();
    page.on("response", (r) => {
      if (r.request().resourceType() !== "image") return;
      // Só o quadro principal, pela mesma razão que o teste de terceiros acima:
      // o mapa do rodapé é um iframe e carrega no contexto dele. Contá-lo aqui
      // misturaria 196 KB de blocos do Google — que variam com o zoom e o
      // recorte — no orçamento das NOSSAS fotos, e o limite passaria a falhar
      // por motivo que ninguém controla.
      if (r.request().frame() !== page.mainFrame()) return;
      // Conta cada URL uma vez: a mesma foto pedida duas vezes é desperdício,
      // mas não é peso novo na conta do visitante.
      bytesPorUrl.set(r.url(), Number(r.headers()["content-length"] ?? 0));
    });

    await page.goto(path, { waitUntil: "load" });
    // As de baixo da dobra: sem isto o orçamento mediria meia página.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState("networkidle");

    const total = [...bytesPorUrl.values()].reduce((s, n) => s + n, 0);
    const kb = Math.round(total / 1024);

    // Sentinela: uma página que não baixou imagem nenhuma passaria por
    // vacuidade, e é justamente o estado em que este teste não verifica nada.
    expect(bytesPorUrl.size, `${path} não carregou imagem nenhuma`).toBeGreaterThan(0);

    const maiores = [...bytesPorUrl.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([u, b]) => `${Math.round(b / 1024)} KB ${decodeURIComponent(u).split("/").pop()?.slice(0, 40)}`)
      .join(" · ");

    expect(
      kb,
      `${path} manda ${kb} KB de imagem (limite ${limite}). As maiores: ${maiores}. ` +
        `Saídas, em ordem: baixar a qualidade, corrigir o \`sizes\` para o celular ` +
        `não pedir o arquivo de desktop, ou mostrar menos fotos na prévia.`,
    ).toBeLessThanOrEqual(limite);
  });
}
