import { expect, test } from "@playwright/test";

/**
 * A CSP só é segura se não quebrar nada — uma política que bloqueia o próprio
 * site é revertida no primeiro relatório de bug, e a proteção some junto.
 *
 * O navegador não falha a página quando bloqueia um recurso: ele registra a
 * violação no console e segue renderizando o resto, torto. Este teste lê esse
 * console. Um teste de HTTP não pega isso — o cabeçalho pode estar certo e o
 * `img-src` ainda assim deixar a foto do cardápio de fora.
 *
 * Rode contra o que está no ar, que é onde a política vale de verdade:
 *
 *   E2E_BASE_URL=https://… npx playwright test e2e/csp.spec.ts
 */

const PAGES = ["/", "/gastronomia", "/galeria", "/reservas", "/contato"];

for (const path of PAGES) {
  test(`${path} carrega sem violar a própria CSP`, async ({ page }) => {
    const violations: string[] = [];

    page.on("console", (message) => {
      const text = message.text();
      if (/content security policy|refused to (load|execute|connect)/i.test(text)) {
        violations.push(`[console] ${text}`);
      }
    });

    // O navegador também dispara um evento na página quando bloqueia algo, e
    // ele traz a direção exata que recusou — informação que a mensagem de
    // console nem sempre carrega.
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        console.error(
          `Content Security Policy bloqueou ${event.blockedURI} por ${event.violatedDirective}`,
        );
      });
    });

    await page.goto(path, { waitUntil: "networkidle" });

    expect(violations, violations.join("\n")).toEqual([]);
  });
}

test("o painel de login carrega sem violar a CSP", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/content security policy|refused to/i.test(message.text())) {
      violations.push(message.text());
    }
  });

  await page.goto("/admin", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  expect(violations, violations.join("\n")).toEqual([]);
});
