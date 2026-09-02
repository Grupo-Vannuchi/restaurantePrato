<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Working in this repo (agents & humans)

**This is the site of the Restaurante Prato**, a lunch restaurant at
R. Augusto Severo, 25, in the Centro of Santos/SP. The repo is a **fork of
another restaurant's finished site** (which was itself a fork of an agency
site), re-skinned for this client — so the restaurant structure (routes, menu,
gallery, WhatsApp reservations, `Restaurant` schema, PT-only) is exactly what we
want to keep, while every piece of *client data* had to be swapped or removed.

Start at [`docs/WHITELABEL-RESTAURANTE-PRATO.md`](docs/WHITELABEL-RESTAURANTE-PRATO.md)
— confirmed data, open pendings and the PR sequence. The decisions and their
rationale live in [`docs/superpowers/`](docs/superpowers/README.md); read that
before undoing something that looks odd.

**Never invent client data.** Replace only where there is a confirmed fact;
remove where there is none. `test/brand-hygiene.test.ts` is a regression guard
that sweeps `src/`, `public/`, `prisma/` and the root instruction files for any
trace of the previous client — including facts it asserted without naming the
brand.

Project conventions distilled from real lessons in this codebase and from the
team's coding skills (`prisma-patterns`, `react-patterns`, `react-performance`,
`security-review`, `nextjs-turbopack`). These rules exist because we hit the
bugs they prevent. Follow them.

## Golden rules (read first)

- **Branch:** develop on `Development`. **Ask before committing**; the human
  does the `git push` manually. Don't push or merge to `main` unless asked.
- **Validate every change** before declaring it done:
  `npm run typecheck && npm run lint && npm run build`. Report failures honestly.
- **Never send secrets to the client.** Keys (Evolution, Google, Upstash, DB)
  stay server-side. No `NEXT_PUBLIC_*` for secrets.
- **Portuguese only.** Every UI string goes in `src/messages/pt.json`. There is
  no `en.json` — the restaurant serves the Centro de Santos and has no
  English-speaking audience. Don't reintroduce a second locale casually.
- **Never invent client data.** Razão social, CNPJ, the LGPD officer's e-mail and
  the final domain are still unknown; `src/content/legal.ts` marks them with
  `«PENDENTE: …»` on purpose. Filling those with a plausible guess — or with the
  agency's old values — is a legal problem, not a cosmetic one.
- Use the dedicated tools/skills. When touching DB, React, security or Next.js,
  the matching skill encodes deeper rules — these are the project-specific subset.

## Where things live

```
src/
  app/[locale]/(marketing)/   public site: / · /experiencia · /cardapio ·
                              /galeria · /reservas · /contato · /novidades ·
                              /privacy · /terms
  app/[locale]/admin/         login + (dashboard) session-guarded admin
  app/actions/                server actions (whatsapp, auth, …)
  components/                 ui, sections, admin
  config/site.ts              ⭐ white-label brand + theme + opening hours
  lib/                        env, prisma, queries (DAL), auth, rate-limit, evolution,
                              validations
  messages/                   pt.json (typed catalog)
  proxy.ts                    Next 16 proxy (next-intl locale negotiation; excludes /api)
prisma/                       schema.prisma + migrations + seed.ts (admin only)
                              + backups/snapshot.sql
docs/                         ARCHITECTURE, RUNBOOK, ADRs, SEO audit, superpowers/specs
```

⚠️ **`/gastronomia` foi removida em 31/08.** Ela era a vitrine do cardápio
herdada do fork — uma grade de cards com foto —, e `/cardapio` a substitui com o
cardápio digital de verdade: dias da semana, buffet e ilha de massas. Manter as
duas seria duas páginas contando a mesma coisa de jeitos diferentes.

Saiu junto **o menu suspenso de categorias do cabeçalho**, e isso é decisão, não
esquecimento: em `/cardapio` as categorias vivem dentro das abas de dia, então
existe uma cópia de cada por dia útil e não há âncora única para onde apontar.
Com ele saiu a consulta que o alimentava, que era uma ida ao banco em toda
página do site. `test/so-existe-uma-rota-de-cardapio.test.ts` guarda o estado
final e varre as sete superfícies que a rota toca.

**Routes are renamed, and the rename is three coupled edits.** The `NavKey` type
in `config/site.ts`, the `nav` keys in `messages/pt.json` and the folder names
under `(marketing)/` must agree. "Nossa Gastronomia" is backed by
`MenuCategory`/`MenuItem`, and the gallery is backed by `GalleryPhoto`. The
agency-era models (`Service`, `Project`, `Client`, `Stat`, `TeamMember`) and
their admin, DAL and seeds are gone — the admin now has exactly six sections:
dashboard, cardápio, galeria, novidades (route/namespace `informations`
was renamed to `novidades`, closing out the marketing-namespace renaming
started by the rebrand), depoimentos (route/namespace stays `testimonials`
— a permanent scope decision, not unfinished work: its label already reads
"Depoimentos" and its entries became verifiable Google reviews, so renaming
the route would cost churn for zero user-visible change, same as renaming
the `Testimonial` model would) and contatos.

**The naming convention this rename settled:** public surface (routes, DOM
anchor ids) and the i18n catalog (`pt.json`) are Portuguese; Prisma models,
file names, functions, cache tags and Storage folders stay English. This is
why `Information`, `Testimonial`, `MenuCategory` and `GalleryPhoto` keep
their English model names forever, even though they back `/novidades`,
`/admin/testimonials` (label "Depoimentos"), `/cardapio` and `/galeria`
respectively — renaming the models would cost a table migration, a mass
cache invalidation and Storage folders pointing nowhere, for zero
user-visible change. Don't "finish the job" later.

**Phone is optional on purpose — hours and cuisine are now known.** The Prato has
no landline, so `contact.phone` stays optional and currently omitted, and every
call CTA disappears on its own. `openingHours` (Mon–Fri 11:00–15:00) and
`servesCuisine` (Brasileira, Churrasco) were confirmed on 19/08/2026 and are now
published — but they stay **optional in the type**, because the degradation they
buy is real and was expensive to build. Don't make them required.

⚠️ **Never format opening hours by hand.** Call `openingHoursLabel()` from
`config/site.ts`. Two consumers used to build the line from `opens`/`closes`
alone and rendered "Aberto das 11h às 15h" — which tells the reader the place
opens on Saturday. The helper always includes the day range.

**Reservations go straight to WhatsApp.** There is no booking backend.
`whatsappLink()` returns `null` while no number is configured, and every caller
must handle that — `ReserveButton` degrades to a `tel:` link. Don't "fix" the
null by hardcoding a number.

## Prisma (database) — skill: `prisma-patterns`

- **Serverless connection pool:** in production `DATABASE_URL` uses the Supabase
  pooler (port 6543) with `?pgbouncer=true` — PgBouncer already caps real DB
  connections. **Do not force `connection_limit=1`** on it: a single connection
  serializes the build's concurrent prerendering and invites a `P2024` pool
  timeout. (An older version of this rule blamed "400+ static pages" — that
  number was folklore. `novidades/[slug]/page.tsx` returns `[]` from
  `generateStaticParams()` on purpose, so article slugs are never prerendered,
  and the build emits 31 pages. The *rule* still stands; only its justification
  was inflated — don't read the correction as permission to force the limit.)
  `DIRECT_URL` (port 5432) is migrations-only and stays unpooled.
- **Migrations:** `prisma migrate deploy` in CI/prod (the Vercel build runs it);
  `prisma migrate dev` **only** on the local Docker DB (it can reset data).
  Never edit a migration file after it has been applied (checksum break).
- **No external calls inside `$transaction`** (5s timeout) — book meetings / send
  WhatsApp *outside* the transaction. Use the array form for independent ops.
- **Never return raw Prisma rows to the client.** Map to a view-model that omits
  secrets (e.g. `CurrentUser` drops `passwordHash`).
- `updateMany`/`deleteMany` return a **count, not rows**; `@updatedAt` is skipped
  on bulk writes; always pass a `where` to `deleteMany`.

## React / Next.js — skills: `react-patterns`, `react-performance`, `nextjs-turbopack`

- **Render is pure.** No `Date.now()`, `Math.random()`, `crypto.randomUUID()`
  or mutation during render — use refs, effects, or event handlers. No
  `setState` during render.
  ⚠️ An older version of this rule claimed the React Compiler was enabled here.
  **It is not** — it appears nowhere in `next.config.ts`, the plugin is not
  installed, and the build does not register it. The claim travelled through seven plan documents
  in `docs/superpowers/plans/` and reached a code comment written on 25/08 that
  justified a decision with it. Those plans are a historical record and stay as
  written; this file is the live instruction and does not.
  **The rule itself stands** — impure render is a React bug with or without the
  compiler; only its justification was inflated. Same shape as the "400+ static
  pages" folklore corrected under Prisma below. `test/documentacao-confere-com-o-build.test.ts`
  now fails if this file and `next.config.ts` disagree about it.
- **Stale closures kill data.** Don't read state you just set in the same handler.
  Compute the new value locally and pass it forward.
- **Kill request waterfalls.** Independent `await`s → `Promise.all`. Check cheap
  sync conditions before awaiting remote data.
- **Don't block a page render on a slow/optional integration.** Load it
  client-side and non-blocking (e.g. the WhatsApp instance manager loads
  instances in an effect, never server-side).
- **Server/client boundary:** keep Prisma, secrets and `server-only` modules on
  the server. `"use client"` only when you need state/effects/handlers.
- **Caching:** read content through the DAL (`src/lib/queries.ts`) with
  `unstable_cache` + `tags`; invalidate with `updateTag(tags.<x>)` on writes.
- **Before coding Next APIs**, read `node_modules/next/dist/docs/` — this is
  Next 16 + Turbopack, not your training data.

## Security — skill: `security-review`

- **Public endpoints** (`submitContactLead`): honeypot + **per-IP rate limit**
  (`lib/rate-limit`, Upstash with in-memory fallback) + `zod` validation as the
  server boundary. (`submitCareerLead` was removed with the careers page — one
  fewer public write endpoint.)
- **Admin** server actions gate on `getCurrentUser()`.
- **Secrets** only in env, read server-side. Never log them; redact in errors.
- **Integration state can go stale** — detect and surface it (the Evolution
  instance connection state feeds the admin WhatsApp panel). Never fail
  silently in a way that mimics a different outcome.
  ⚠️ **An optional integration that degrades has to say so.** Two broke this on
  the same day: the Instagram vars sat in the *client* schema, so the token
  would always be `undefined` and the feed would never render; and the rate
  limiter fell back to an in-memory window with no warning, which on Vercel —
  where instances are recycled and each keeps its own counter — is almost no
  protection wearing the shape of protection. Neither failed anything: build
  green, tests green, page rendered. `test/nenhuma-integracao-degrada-calada.test.ts`
  now reads the optional vars straight out of `serverSchema` and demands each
  one be declared in one of two inventories — *this is how its absence shows*,
  naming the file and symbol that surface it, or *this has a safe default /
  fails loudly*, with the reason. A new optional var breaks the test until
  someone writes down which it is. The point is that the choice becomes
  deliberate rather than an omission.
- **Headers** are set in `next.config.ts`, CSP included. It is **partial by
  decision, not by omission**: `script-src` keeps `'unsafe-inline'` because Next
  inlines the RSC payload as 23 `<script>` blocks per page — only a per-request
  nonce removes it, and that drops all 31 prerendered pages to on-demand
  rendering. The trade was settled by measurement, not preference: every place
  stored data becomes HTML was swept and closed at the source. ADR-0004 lists
  them and names the three conditions that reopen it. **Don't add a nonce
  middleware on a hunch** — and don't read `'unsafe-inline'` as unfinished work.
  ⚠️ **Whatever the page loads, the policy must name.** The footer's Google
  Maps iframe was refused the moment the CSP shipped — `frame-src` was missing
  and it fell back to `default-src 'self'`. Nothing failed server-side: build
  green, HTTP 200, and an empty rectangle for the visitor. `e2e/csp.spec.ts`
  reads the browser console on six pages **after scrolling to the footer**,
  because the map is lazy-loaded and only the shortest page exposed it.
- Validate user input with `zod`; rely on Prisma's parameterized queries (no raw
  SQL concatenation).

## i18n

- `next-intl`, **Portuguese only** (`locales = ["pt"]`). Add keys to
  `pt.json`. `LocalizedText` is still a `Record<Locale, string>`, so DB content
  keeps its JSON shape — there is just one key in it now. ICU braces in stored
  copy that should render literally must be escaped: `'{NOME}'`.
- **A missing ICU placeholder fails silently, not loudly.** Calling `t()`/`t.rich()`
  on a message that has a `{placeholder}` without supplying it doesn't throw —
  next-intl's default `getMessageFallback` prints the key itself instead (this is
  exactly how `/experiencia` once rendered the literal string `experiencia.lead`
  on the page). Neither `npm run typecheck` nor `npm run build` catches it.
  `test/icu-placeholders.test.tsx` audits the catalog's placeholder inventory
  against its call sites — extend it when you add a message with a placeholder,
  don't just eyeball the page.

## Brand & theme

- **One palette, one look.** The site had three appearance states (light, dark
  and "whatever the OS says") with a toggle, inherited from the fork. The client
  delivered a single palette on 26/08 — off white, near-black and two greens —
  and keeping the three would have meant inventing the dark variants they never
  supplied. The toggle, the `prefers-color-scheme` blocks and the `data-theme`
  attribute are gone; `theme-style.tsx` emits one `:root` rule and keeps
  `color-scheme: light`, which is what makes the browser paint form fields,
  scrollbar and address bar in the right tone. `test/uma-cara-so.test.ts` fails
  if any of that machinery comes back — including a stray Tailwind `dark:`
  variant, which reads `prefers-color-scheme` on its own and would repaint the
  site behind the reader's back.
- **The palette is the client's, delivered on 26/08**: primary `#68822A`,
  secondary `#A5C842`, off white `#FFFFFF`, contrast `#0C0C0C`. Two of them
  needed a rule, and both are measurement, not taste:
  - `brand` ships `#607827`, not the client's `#68822A`. The original gives
    4.36:1 on white and 4.36:1 with white text on top — it fails the 4.5:1
    minimum in both directions. And white is not the worst case: brand-coloured
    text also sits on card and muted surfaces, which are darker, so the number
    that governs is the darkest one. `#607827` clears all three (4.98 / 4.80 /
    4.52). Eight per cent darker, the same green to the eye.
  - `accent` is the client's `#A5C842` untouched, but it is a **surface**
    colour, never a stroke: 1.92:1 on white makes it invisible as text or as a
    thin line; with near-black text on top it is 10.31:1, and that is how it
    appears. Icons and graphic detail use `brand`.
  ⚠️ **Never eyeball a palette change.** `test/palette-contrast.test.ts` reads
  the colours from `siteConfig` and names the failing pair. There is also
  `node docs/superpowers/specs/2026-08-07-palette-contrast.mjs`, which did this
  once by hand with the hexes written inside it. The
  brand-coloured closing card on `/` and `/experiencia` now
  renders from one shared component (`components/sections/closing-cta.tsx`), so
  that swap touches one place instead of three.
- ⚠️ **The logo has not arrived either.** The mark is typographic
  (`components/layout/logo.tsx`, `app/icon.tsx`, `apple-icon.tsx`,
  `[locale]/opengraph-image.tsx`); the previous client's files were removed. See
  [`public/brand/README.md`](public/brand/README.md).
- Headings are a display serif (Playfair), body is the sans. Set in
  `globals.css` under `@layer base`, scoped to `h1`–`h3`.
- **No prices anywhere — inherited, not settled.** There is no price field in
  the menu schema and no `priceRange` in the JSON-LD. That was the *previous*
  client's product direction, carried over by the fork; whether the Restaurante
  Prato wants prices is an open question (§4.1 of the rebrand spec). Adding them
  means schema, admin and validation changes — don't do it on a hunch, and don't
  "clean up" the absence either.
- **Reviews never enter structured data — permanent rule.** Testimonials render
  on the page (`components/sections/testimonials.tsx`), each one linking to its
  real source via `source`/`sourceUrl`. They must never feed the `Restaurant`
  JSON-LD (`components/json-ld.tsx`): Google forbids *self-serving reviews* —
  emitting `Review`/`aggregateRating` about your own business, on your own
  site, risks losing the rich result entirely. Don't "helpfully" wire
  testimonials into the schema later. **This is now enforced, not just
  written:** `test/json-ld-sem-avaliacao.test.ts` fails if `json-ld.tsx` so much
  as imports testimonial data, and `e2e/structured-data.spec.ts` parses what the
  published pages actually emit and refuses `review`/`aggregateRating` at any
  nesting depth. Both carry a sentinel assertion, so they fail instead of
  passing vacuously if the schema moves elsewhere.

## Workflow & board

- Conventional commits; end the message with
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` when an agent helped.
- **A `pre-push` hook runs `npm run typecheck`.** It exists because `pt.json` — the
  whole UI catalogue in one file — regressed twice, the second time breaking the
  Vercel deploy, the CI and the E2E suite at once. A clone only gets the hook after
  `npm install` (that is what points `core.hooksPath` at `.githooks/`), and
  `core.hooksPath` **replaces `.git/hooks` entirely**, so a new hook must live in
  `.githooks/` or it never runs. `--no-verify` is the conscious escape hatch.
- **`git push upstream` is disabled** (`--push` URL set to `no_push`). `upstream` is
  the agency's repo this project was forked from; a stray push would publish the
  client's site there. It is *local* config — a fresh clone must re-run
  `git remote set-url --push upstream no_push`.
- **The site ships closed to search engines.** `SITE_INDEXABLE` defaults to `false`,
  and only the exact string `"true"` opens it — see `docs/RUNBOOK.md`. Don't
  "helpfully" flip the default: while `src/content/legal.ts` still carries a
  `«PENDENTE»`, an indexed site is a legal problem, not a milestone.
- **Prisma config lives in `prisma.config.ts`**, not `package.json#prisma` (removed
  in Prisma 7). ⚠️ Once any Prisma config file exists, the CLI **stops auto-loading
  `.env`** — the config loads it itself, guarded by `existsSync` so it is a no-op on
  Vercel and CI, which inject real environment variables.
- Tasks on the "Desenvolvimento Vannuchi" board use the title format
  `[ÁREA] - verbo + tarefa`, where ÁREA ∈ **CRE** (novo do zero) · **IMP**
  (integrar o que existe) · **UPD** (melhorar o que existe) · **CRX** (corrigir)
  · **RMV** (remover). See [`.github/ISSUE_TEMPLATE/task.md`](.github/ISSUE_TEMPLATE/task.md).

## Operations

Many integrations need manual setup/maintenance (Google reconnect + publish,
WhatsApp QR, Upstash, Vercel env vars). The steps live in
**[`docs/RUNBOOK.md`](docs/RUNBOOK.md)**; restore/snapshot lives in
[`SNAPSHOT.md`](SNAPSHOT.md).
