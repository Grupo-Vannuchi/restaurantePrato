<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Working in this repo (agents & humans)

**This is the site of the Restaurante Prato**, a restaurant and coffee shop at
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
  app/[locale]/(marketing)/   public site: / · /experiencia · /gastronomia ·
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
`/admin/testimonials` (label "Depoimentos"), `/gastronomia` and `/galeria`
respectively — renaming the models would cost a table migration, a mass
cache invalidation and Storage folders pointing nowhere, for zero
user-visible change. Don't "finish the job" later.

**Phone, opening hours and cuisine are optional on purpose.** The Prato has no
landline, and its hours and cuisine types have not been confirmed, so
`contact.phone`, `openingHours` and `servesCuisine` are optional in `SiteConfig`
and currently omitted. Every consumer degrades: the call CTAs disappear, and
`openingHoursSpecification`/`servesCuisine` drop out of the `Restaurant` schema
instead of publishing a wrong value. Don't make them required again, and don't
fill them with the previous client's values.

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

- **Render is pure** (React Compiler is on). No `Date.now()`, `Math.random()`,
  `crypto.randomUUID()` or mutation during render — use refs, effects, or event
  handlers. No `setState` during render.
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
- **Headers** are set in `next.config.ts`. CSP is intentionally **deferred**
  (needs a nonce middleware; would break inline JSON-LD) — see ADR-0004.
- Validate user input with `zod`; rely on Prisma's parameterized queries (no raw
  SQL concatenation).

## i18n

- `next-intl`, **Portuguese only** (`locales = ["pt"]`). Add keys to
  `pt.json`. `LocalizedText` is still a `Record<Locale, string>`, so DB content
  keeps its JSON shape — there is just one key in it now. ICU braces in stored
  copy that should render literally must be escaped: `'{NOME}'`.

## Brand & theme

- **Dark-first.** The dark palette sits on bare `:root` in `theme-style.tsx`;
  light is the variant. `globals.css` mirrors that inversion for the neutral
  tokens — keep the two files agreeing about which theme is the default.
- ⚠️ **The palette in `site.ts` is inherited from the project this repo was
  forked from** and is there only so the site keeps rendering. The Restaurante
  Prato colours have not arrived yet — swapping them is PR 2. The light theme
  ships a darker brand hex than the dark theme on purpose: the pure tone over
  the cream ground was 2.14:1. Verify any palette change with
  `node docs/superpowers/specs/2026-08-07-palette-contrast.mjs`.
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
  testimonials into the schema later.

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
