import { expect, test } from "@playwright/test";

/**
 * O conteúdo que entra com animação aparece mesmo sem JavaScript.
 *
 * **O defeito.** `globals.css` declara `[data-reveal] { opacity: 0 }`, e quem
 * devolve a opacidade é o `data-visible="true"` que o componente `Reveal` põe
 * num efeito, no cliente. O servidor entrega `data-visible="false"`. Sem
 * JavaScript o atributo nunca vira, e o elemento fica invisível para sempre —
 * na galeria são todas as fotos, e a página parece vazia.
 *
 * ⚠️ **Não é um caso hipotético de "quem desliga o script".** O mesmo estado
 * acontece quando o pacote de JavaScript simplesmente não chega: 3G ruim no
 * Centro, aba aberta e abandonada, bloqueador que engole um chunk. O HTML chega
 * inteiro, o texto está lá, e a pessoa vê uma página em branco. A informação
 * existir no HTML e não aparecer na tela é a pior das duas falhas, porque não
 * parece erro de rede — parece restaurante sem cardápio.
 *
 * ⚠️ **A correção é `<noscript>` no layout, e não `@media (scripting: none)`.**
 * A consulta de mídia é mais elegante e resolve o mesmo caso, mas é do Media
 * Queries nível 5: navegador antigo a ignora, e navegador antigo é exatamente
 * a população que também pode não estar executando o script. `<noscript>` com
 * um `<style>` dentro funciona em tudo que existe.
 *
 * ⚠️ **O primeiro bloco roda com o script desligado** (`javaScriptEnabled:
 * false`), o que o torna o único lugar da suíte que exercita o HTML entregue
 * pelo servidor sem hidratação nenhuma. Se um dia ele começar a falhar por
 * "elemento não encontrado" em vez de opacidade, é porque a página passou a
 * depender de JavaScript para RENDERIZAR, e não só para animar — o que é uma
 * notícia maior que a desta guarda.
 */
test.describe("sem JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  /**
   * As páginas onde o `Reveal` carrega conteúdo, e não enfeite. `minimo` é
   * quantos elementos revelados a página tem de ter: sentinela contra a guarda
   * passar porque não encontrou nada para examinar.
   */
  const PAGINAS = [
    { rota: "/galeria", nome: "as fotos da galeria", minimo: 8 },
    { rota: "/", nome: "as seções da home", minimo: 3 },
    { rota: "/experiencia", nome: "os blocos da Experiência", minimo: 3 },
  ];

  for (const { rota, nome, minimo } of PAGINAS) {
    test(`${nome} são visíveis sem JavaScript`, async ({ page }) => {
      await page.goto(rota, { waitUntil: "domcontentloaded" });

      const revelados = page.locator("[data-reveal]");
      const total = await revelados.count();

      expect(
        total,
        `${rota} tem ${total} elementos com [data-reveal], menos que os ${minimo} ` +
          `esperados. Ou a página mudou de estrutura, ou ela deixou de renderizar no ` +
          `servidor — nos dois casos esta guarda não está mais examinando o que diz.`,
      ).toBeGreaterThanOrEqual(minimo);

      /*
       * A opacidade é lida do estilo COMPUTADO, um por um: é o número que decide
       * se a pessoa vê ou não vê. Conferir o atributo `data-visible` provaria
       * apenas que o componente escreveu o que escreve — e sem script ele
       * escreve "false" de propósito, que é o estado correto do servidor. O que
       * não pode é esse estado significar invisível.
       */
      const invisiveis = await revelados.evaluateAll((nos) =>
        nos
          .map((n, i) => ({ i, opacidade: Number(getComputedStyle(n).opacity) }))
          .filter((x) => x.opacidade < 0.99)
          .slice(0, 5),
      );

      expect(
        invisiveis,
        `Sem JavaScript, ${invisiveis.length} elemento(s) de ${rota} ficam com ` +
          `opacidade abaixo de 1 — ${JSON.stringify(invisiveis)}. O conteúdo está no ` +
          `HTML e não aparece na tela. Causa: a regra [data-reveal]{opacity:0} de ` +
          `src/app/globals.css sem a contrapartida em <noscript>, que vive no <head> ` +
          `de src/app/[locale]/layout.tsx, ao lado do ThemeStyle.`,
      ).toEqual([]);
    });
  }
});

/**
 * O contrapeso: COM JavaScript a animação continua existindo.
 *
 * ⚠️ **Sem este teste, a guarda acima teria uma correção trivial e errada:
 * apagar a regra `[data-reveal] { opacity: 0 }`.** Tudo ficaria visível, os três
 * casos passariam verdes, e a entrada suave — que é decisão de desenho, não
 * enfeite acidental — teria sido removida sem ninguém perceber. Uma guarda que
 * só empurra numa direção é uma guarda que aceita ser satisfeita pelo caminho
 * mais curto.
 *
 * O elemento medido é o ÚLTIMO da galeria, bem abaixo da dobra: os primeiros já
 * foram revelados pelo `IntersectionObserver` antes de a medição acontecer.
 *
 * Nada de `reducedMotion` aqui. A regra vive dentro de
 * `@media (prefers-reduced-motion: no-preference)`, então emular a preferência
 * de movimento reduzido mediria justamente o caso em que não há animação.
 */
test.describe("com JavaScript", () => {
  test("a entrada suave continua existindo", async ({ page }) => {
    await page.goto("/galeria", { waitUntil: "domcontentloaded" });

    const ultimo = page.locator("[data-reveal]").last();
    await expect(ultimo).toBeAttached();

    const estado = await ultimo.evaluate((n) => ({
      opacidade: Number(getComputedStyle(n).opacity),
      visivel: n.getAttribute("data-visible"),
    }));

    expect(
      estado,
      `O último elemento revelado da galeria está em ${JSON.stringify(estado)}. ` +
        `Esperava opacidade 0 e data-visible="false" — ele está longe da dobra e ` +
        `não deveria ter sido revelado ainda. Se a opacidade já é 1, a regra ` +
        `[data-reveal]{opacity:0} de src/app/globals.css foi removida, ou o <noscript> ` +
        `do layout vazou para o caso com script: a animação de entrada deixou de ` +
        `existir e a guarda de cima passou a ser satisfeita pelo caminho errado.`,
    ).toEqual({ opacidade: 0, visivel: "false" });
  });
});
