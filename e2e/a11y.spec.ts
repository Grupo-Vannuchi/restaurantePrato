import { expect, test } from "@playwright/test";

/**
 * Acessibilidade estrutural — o que dá para verificar sem ferramenta externa e
 * que quebra de verdade a navegação de quem não usa mouse.
 *
 * Estes três apontamentos vieram de uma auditoria manual em 20/08/2026 contra
 * o site publicado; virar teste é o que impede a regressão silenciosa. Nenhum
 * deles aparece em `npm run build`, `typecheck` ou `lint`.
 */

const PAGES = [
  "/",
  "/experiencia",
  "/gastronomia",
  "/galeria",
  "/reservas",
  "/contato",
  "/novidades",
];

for (const path of PAGES) {
  test(`${path} deixa pular o menu com o teclado`, async ({ page }) => {
    // Critério WCAG 2.4.1 (nível A). Sem isto, quem navega por teclado passa
    // pelos links do cabeçalho inteiro em toda página antes de chegar ao texto.
    await page.goto(path);
    await page.keyboard.press("Tab");

    const focado = page.locator(":focus");
    await expect(focado).toHaveAttribute("href", "#conteudo");
    // Escondido para quem enxerga, visível assim que recebe foco: um link que
    // ninguém vê nem com Tab não ajuda ninguém.
    await expect(focado).toBeVisible();

    await focado.press("Enter");
    await expect(page.locator("main#conteudo")).toBeVisible();
  });

  test(`${path} não pula nível de título`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });

    const saltos = await page.evaluate(() => {
      const níveis = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
        nível: Number(h.tagName[1]),
        texto: (h.textContent ?? "").trim().slice(0, 40),
      }));
      const encontrados: string[] = [];
      for (let i = 1; i < níveis.length; i++) {
        if (níveis[i].nível - níveis[i - 1].nível > 1) {
          encontrados.push(
            `h${níveis[i - 1].nível} ("${níveis[i - 1].texto}") → h${níveis[i].nível} ("${níveis[i].texto}")`,
          );
        }
      }
      return encontrados;
    });

    // Um salto de h1 para h3 faz o leitor de tela anunciar um nível que não
    // existe na página. Nas páginas ainda sem conteúdo — galeria e novidades —
    // não há `h2` nenhum, então o `h3` do rodapé ficava logo abaixo do título.
    expect(saltos, saltos.join(" | ")).toEqual([]);
  });

  test(`${path} descreve toda imagem`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const semAlt = await page.evaluate(
      () =>
        [...document.querySelectorAll("img")].filter((img) => !img.hasAttribute("alt"))
          .length,
    );
    expect(semAlt).toBe(0);
  });
}
