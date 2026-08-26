# Testing plan

The strategy and rollout for automated tests in this codebase. Grounded in the
`react-testing` and `e2e-testing` skills. Status: **Phase 3a and 3b landed**
(Vitest base + unit/component tests + CI, Playwright + E2E + CI). Phase 3c
(growth) is ongoing. The funnel subsystem that the suite originally covered
(`funnel-runner`, `funnel-form`, `funnel-scheduler`, a seeded E2E funnel) has
since been removed along with the rest of the funnels feature — this doc now
describes the suite as it exists today, built around the contact form.

## Philosophy

Test the **test pyramid**, behavior over implementation:

```
        ▲  few   E2E (Playwright) ............ full user flows, real browser
       ███       Component (Vitest + RTL) ..... a component's behavior + a11y
      █████ many Unit (Vitest) ................ pure logic (no DB, no DOM)
```

- **Test what the user sees and does**, not internal state, props, or render counts.
- Query by **role/label/text** first; `data-testid` is the escape hatch.
- A pure function or a component with logic → **Vitest/RTL**. A flow across pages,
  real layout, or a browser API JSDOM lacks → **Playwright**.

## Tooling to add (dev deps)

| Layer | Packages |
|---|---|
| Unit / component | `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `vitest-axe` |
| E2E | `@playwright/test` (+ `npx playwright install`) |

Scripts (package.json):

```jsonc
"test": "vitest run",
"test:watch": "vitest",
"test:cov": "vitest run --coverage",
"test:e2e": "playwright test"
```

## Setup pieces

### Vitest
- **`vitest.config.ts`** — `environment: "jsdom"`, the `@/` alias mirroring
  `tsconfig.json`, a setup file, coverage (v8). Crucially, **stub static asset
  imports** (`*.png`, `*.svg`) so tests don't need `next build`/`next-env.d.ts`:
  ```ts
  resolve: { alias: { "@": "/src", "\\.(png|jpe?g|svg|webp)$": "/test/asset-stub.ts" } }
  ```
- **`test/setup.ts`** — `import "@testing-library/jest-dom"`; extend `vitest-axe`.
- **`test/test-utils.tsx`** — a `renderWithIntl(ui, { locale })` that wraps in
  `NextIntlClientProvider` with the real `src/messages/pt.json`, so `t()` returns
  the actual copy and assertions read like the UI.

### What to mock (and what NOT)
- **Server actions** (`submitContactLead`, …): the app uses Server Actions,
  **not client `fetch`** — so don't reach for MSW for these. `vi.mock` the
  action module and assert it was called with the right payload:
  ```ts
  vi.mock("@/app/actions/leads", () => ({ submitContactLead: vi.fn() }));
  ```
  (Use **MSW** only if/when a real client-side `fetch` appears.)
- **`@/lib/prisma`**: mock it for any action *unit* test (no DB in unit tests).
- **Never** mock React or `next-intl` internals; wrap with the real provider.
- React Compiler is off in Vitest (plain React) — and off in the build too:
  it is not configured anywhere. Purity is still required; it is a React
  rule, not a compiler rule. See the note in `AGENTS.md`.

### Playwright
- **`playwright.config.ts`** — `webServer` runs the app against a **test DB**
  (`npm run build && npm run start`, or `npm run dev` locally); `retries: 2` in
  CI, `workers: 1` in CI; `trace: "on-first-retry"`, `screenshot/video:
  "...-on-failure"`. Projects: chromium (+ mobile-chrome later). No
  `globalSetup` — the contact form needs no seeded content, so nothing runs
  before the suite.
- Prefer accessible locators (`getByRole`/`getByText`); add a few `data-testid`
  only where a flow is genuinely ambiguous.

## What to test — prioritized

### Unit (Vitest) — pure logic, fast, high coverage
| Target | File | Why |
|---|---|---|
| phone normalize / mask (BR → E.164) | `src/lib/phone.ts` | pure, edge cases |
| rate-limit in-memory window | `src/lib/rate-limit.ts` | pure, fail-open |
| zod schemas (lead) | `src/lib/validations/*` | boundary rules + honeypot |

### Component (Vitest + RTL) — behavior + a11y
| Target | File | Key cases |
|---|---|---|
| `contact-form` | `src/components/forms/contact-form.tsx` | honeypot dropped; zod errors shown; success state; **axe: no violations** |

### E2E (Playwright) — full flows
| Flow | Notes |
|---|---|
| Contact form submit | fill → success; (optionally) honeypot path |
| Admin smoke | login → one CRUD action visible |

## Conventions (from the skills)
- `await` every `userEvent`; `userEvent.setup()` once per test.
- Async: `findBy*` / `waitFor` — **never** `setTimeout` + assert.
- No DOM snapshots (break on styling, rubber-stamped). Snapshots only for pure
  serializers.
- Run **axe** on every interactive component.
- Coverage targets: utils ≥90%, hooks ≥85%, presentational ≥80%, containers ≥70%.
  Start thresholds **non-blocking**, tighten over time.

## CI integration
- **Vitest → the existing job** (`.github/workflows/ci.yml`): add a `Test` step.
  It's fast and needs no browser/DB (static assets are stubbed), so it can run
  early. Goal: a red `npm run test` blocks the PR.
- **Playwright → a separate workflow** (`.github/workflows/e2e.yml`, heavier:
  browsers + app + DB): `playwright install --with-deps chromium`, the Postgres
  service, migrations, `npm run test:e2e` (which builds/starts the app), and an
  uploaded report artifact. Runs on PRs/pushes; not yet a required merge check
  (see Phase 3b).

## Phased rollout

### Phase 3a — Vitest base + first tests + CI  *(DONE)*
- [x] Deps + scripts (`test`, `test:watch`) + `vitest.config.ts` + `test/setup.ts` + `test/test-utils.tsx`. Asset stub deferred — the tested components don't import images; add it when one does.
- [x] Unit tests: `phone`, `rate-limit` (exported `memLimit`).
- [x] Component tests: `contact-form` (honeypot hidden + validation + success + axe).
- [x] Added the `Test` step to `ci.yml` (runs first — no DB/browser needed).
- **Done:** `npm run test` is green (3 files, 19 tests). *(Landed with more coverage —
  `interpolateTokens`, `funnel-form` round-trip, and the `funnel-runner`
  answers-regression component test — that was removed along with the rest of
  the funnels subsystem; see
  [`docs/superpowers/plans/2026-08-10-remover-funis.md`](superpowers/plans/2026-08-10-remover-funis.md).)*

### Phase 3b — Playwright + E2E  *(DONE)*
- [x] Playwright + `playwright.config.ts` (chromium; `locale: pt-BR` so next-intl serves pt content; `webServer` = dev locally / `build && start` in CI). No `globalSetup` — the contact form needs no seeded content.
- [x] E2E: submit the contact form. `npm run test:e2e` (`e2e/contact.spec.ts`, 1 passing).
- [x] CI: separate `.github/workflows/e2e.yml` (Postgres service + `playwright install --with-deps chromium` + migrations + `test:e2e` + report artifact). **Not yet a required merge check** — let it prove stable, then add it to branch protection.
- **Done:** `npm run test:e2e` green locally; the E2E workflow runs on PRs/pushes.
  *(Originally also seeded and ran a funnel end-to-end via `prisma/seed-e2e.ts`
  in `globalSetup`; both were removed with the funnels subsystem.)*

### Phase 3c — grow coverage  *(ongoing)*
- [x] Coverage reporting wired (`npm run test:cov`, v8) — **non-blocking** (no thresholds yet; baseline ~7%).
- [ ] Add tests with each new feature (TDD where it fits).
- [ ] Tighten coverage thresholds once the base is stable.

## Anti-patterns to avoid
`container.querySelector`, asserting render counts, mocking React/`next-intl`,
mocking child components by default, ignoring `act()` warnings, `waitForTimeout`,
DOM snapshots. (See the `react-testing` / `e2e-testing` skills for the full list.)

## Open decisions
1. Add the Playwright **CI job now** or run E2E locally first? *(recommend: local first)*
2. **Enforce coverage thresholds** from the start, or start non-blocking? *(recommend: non-blocking, then tighten)*
3. E2E browsers: chromium-only at first, or add firefox/webkit/mobile? *(recommend: chromium first)*
