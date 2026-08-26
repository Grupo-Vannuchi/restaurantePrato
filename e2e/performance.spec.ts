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

for (const path of ["/", "/gastronomia", "/galeria"]) {
  test(`${path} pinta o maior elemento em menos de ${LIMITE_LCP_MS}ms`, async ({
    page,
  }) => {
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
for (const path of ["/", "/gastronomia", "/contato"]) {
  test(`${path} não entrega o catálogo do painel ao visitante`, async ({
    request,
  }) => {
    const html = await (await request.get(path)).text();

    // Textos que só existem na namespace `admin` do catálogo.
    expect(html).not.toContain("Painel administrativo");
    expect(html).not.toContain("Não foi possível criar a instância");
  });
}
