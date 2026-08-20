import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Local-first: runs the app via `npm run dev` (reusing a running
 * server if there is one) against the local DB and runs the specs in `e2e/`.
 * CI wiring (separate job) comes later.
 *
 * `E2E_BASE_URL` aponta a suíte para um site já publicado — o deploy da Vercel,
 * por exemplo — em vez de subir servidor nenhum. Serve de teste de fumaça pós
 * deploy: é o único jeito de exercitar o que está de fato no ar, com o banco,
 * o proxy e os cabeçalhos reais, e não uma cópia local que só se parece com ele.
 *
 * ⚠️ Contra um ambiente real, `contact.spec.ts` **escreve**: ele envia o
 * formulário e grava um lead de verdade. Rode-o assim só com a limpeza
 * combinada de antemão, ou selecione apenas os specs de leitura:
 *
 *   E2E_BASE_URL=https://… npx playwright test e2e/metadata-routes.spec.ts
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "html" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    // Force the browser locale so next-intl serves Portuguese (default,
    // unprefixed) instead of redirecting to /en.
    locale: "pt-BR",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Sem servidor local quando a suíte mira um site publicado: subir um seria
  // desperdício e, pior, mascararia uma falha do deploy com um build local que
  // funciona.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Locally: the dev server (fast, reused if already running). In CI: a
        // real production build + start, which is what E2E should exercise.
        command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: process.env.CI ? 180_000 : 120_000,
      },
});
