import { expect, test } from "@playwright/test";

import pt from "../src/messages/pt.json";

/**
 * Páginas de erro — as únicas que o visitante encontra sem querer.
 *
 * Elas escapam de toda revisão: ninguém abre a página 404 ao conferir um site,
 * e nenhum comando do projeto a renderiza. Foi assim que a do Restaurante
 * Prato ficou em inglês, com a cor de link da agência, num site que não tem
 * outro idioma.
 */

test("um endereço inexistente devolve 404 de verdade", async ({ request }) => {
  // O status importa tanto quanto o texto: uma página de erro que responde 200
  // faz buscador indexar "não encontrado" como se fosse conteúdo.
  const response = await request.get("/rota-que-nao-existe-jamais");
  expect(response.status()).toBe(404);
});

test("a página de erro fala português", async ({ page }) => {
  await page.goto("/rota-que-nao-existe-jamais");

  await expect(page.locator("html")).toHaveAttribute("lang", /^pt/);
  await expect(page.getByText(pt.notFound.title)).toBeVisible();
  await expect(page.getByRole("link", { name: pt.notFound.back })).toBeVisible();
});

test("a página de erro leva de volta ao site", async ({ page }) => {
  await page.goto("/rota-que-nao-existe-jamais");
  await page.getByRole("link", { name: pt.notFound.back }).click();
  await expect(page).toHaveURL(/\/$/);
});
