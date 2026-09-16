import { expect, test } from "@playwright/test";

/**
 * ⚠️ Este teste **escreve no banco**: ele envia o formulário e grava um contato
 * de verdade.
 *
 * Contra `localhost` isso é o esperado. Contra um site publicado, cada execução
 * deixa um "Ana E2E" na lista de contatos do restaurante — foi o que aconteceu
 * duas vezes em 20/08/2026, rodando a suíte inteira contra o deploy para
 * conferir acessibilidade e CSP. O aviso existia num comentário do
 * `playwright.config.ts`, e comentário não impede nada.
 *
 * Por isso ele se pula sozinho quando o alvo é um site publicado. Para rodá-lo
 * de propósito — e a limpeza é sua:
 *
 *   E2E_ALLOW_WRITES=1 E2E_BASE_URL=https://… npx playwright test e2e/contact.spec.ts
 */
test.skip(
  Boolean(process.env.E2E_BASE_URL) && process.env.E2E_ALLOW_WRITES !== "1",
  "escreve no banco: contra site publicado, só com E2E_ALLOW_WRITES=1",
);

test("submits the contact form and shows the success state", async ({ page }) => {
  await page.goto("/contato");

  await page.getByLabel("Nome").fill("Ana E2E");
  await page.getByLabel("E-mail").fill("ana.e2e@example.com");
  /*
   * ⚠️ **Pelo PAPEL, e não só pelo rótulo — `getByLabel("Mensagem")` casa dois
   * elementos.** O `<form>` tem `aria-labelledby` apontando para o título da
   * seção, "Mande uma mensagem", e a busca por rótulo do Playwright é por
   * SUBSTRING: o formulário inteiro casa junto com a caixa de texto, e a
   * chamada morre com "strict mode violation".
   *
   * Isso não é defeito do site — formulário com nome acessível é o que o
   * transforma em marco de navegação, e a guarda de acessibilidade cobra
   * justamente isso. É a consulta que estava frouxa.
   *
   * ⚠️ E ela estava frouxa desde sempre sem ninguém ver, porque este spec é o
   * único que **só roda no caminho local**: ele se pula sozinho quando há
   * `E2E_BASE_URL`, e o caminho local apontava para a porta 3000 — o projeto
   * irmão — até 16/09. Achado ao consertar a porta.
   */
  await page
    .getByRole("textbox", { name: "Mensagem", exact: true })
    .fill("Mensagem de teste E2E com mais de dez caracteres.");

  await page.getByRole("button", { name: "Enviar mensagem" }).click();

  await expect(
    page.getByText("Mensagem enviada! Em breve entramos em contato."),
  ).toBeVisible();
});
