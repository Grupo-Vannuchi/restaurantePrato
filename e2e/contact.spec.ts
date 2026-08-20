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
  await page
    .getByLabel("Mensagem")
    .fill("Mensagem de teste E2E com mais de dez caracteres.");

  await page.getByRole("button", { name: "Enviar mensagem" }).click();

  await expect(
    page.getByText("Mensagem enviada! Em breve entramos em contato."),
  ).toBeVisible();
});
