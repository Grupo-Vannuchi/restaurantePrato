# Restaurante Prato

[![CI](https://github.com/Grupo-Vannuchi/restaurantePrato/actions/workflows/ci.yml/badge.svg)](https://github.com/Grupo-Vannuchi/restaurantePrato/actions/workflows/ci.yml)

Site institucional do **Restaurante Prato**, restaurante de almoço no Centro de
Santos/SP, construído com Next.js 16 (App Router), TypeScript, Tailwind CSS v4,
Prisma e PostgreSQL: hero, a experiência da casa, o cardápio, galeria,
horários & reservas, contato, avaliações — mais um admin autenticado.

O projeto é um **fork do site pronto de outro restaurante**, re-skinado para o
Prato — o contexto do rebrand, com os dados confirmados e as pendências, está em
[`docs/WHITELABEL-RESTAURANTE-PRATO.md`](docs/WHITELABEL-RESTAURANTE-PRATO.md). A
marca inteira sai de um único arquivo de configuração, o site é **só em
português** via next-intl, e todo o conteúdo dinâmico vive no Postgres e é
editável pelo admin.

> **Reservas acontecem no WhatsApp**, sem backend de agendamento: os CTAs abrem
> um deep link `wa.me` com mensagem pré-preenchida. Sem número configurado, eles
> degradam para o telefone — ver `whatsappLink()` em `src/config/site.ts`.

## Documentation

| Doc | What |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Conventions & rules — **read before coding** (DB, React, security, Next). |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Setup, workflow, commit/board conventions. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the system fits together + lead notification. |
| [`docs/RUNBOOK.md`](docs/RUNBOOK.md) | Operations: WhatsApp, Upstash, env vars, deploy. |
| [`docs/adr/`](docs/adr/) | Architecture decision records (the *why*). |
| [`docs/TESTING.md`](docs/TESTING.md) | Testing strategy & rollout plan. |
| [`SECURITY.md`](SECURITY.md) | Security policy & pre-deploy checklist. |
| [`SNAPSHOT.md`](SNAPSHOT.md) | Restore/snapshot & first production deploy. |
| [`docs/seo/`](docs/seo/) | SEO audit & action plan. |

---

## Stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js 16 (App Router, Server Components, Turbopack) |
| Language       | TypeScript (strict)                               |
| Styling        | Tailwind CSS v4 (CSS-first `@theme`)              |
| i18n           | next-intl 4 (locale routing + typed messages)     |
| Database / ORM | PostgreSQL + Prisma 6                             |
| Auth           | jose (HS256 JWT session) + bcryptjs               |
| Forms          | react-hook-form + zod (shared client/server schema) |
| Icons          | lucide-react                                      |

## Architecture at a glance

```
src/
  app/
    [locale]/
      (marketing)/        # público: home, experiencia, cardapio, galeria,
                          #          reservas, contato, informations, privacy, terms
      admin/
        login/            # public login screen
        (dashboard)/      # session-guarded: dashboard + leads management
      layout.tsx          # root <html>: fonts, theme, NextIntlClientProvider
    actions/              # server actions (leads, auth, admin)
    sitemap.ts robots.ts manifest.ts
  components/             # ui primitives, layout, sections, forms, admin
  config/site.ts          # ⭐ white-label brand config (single source of truth)
  i18n/                   # routing, navigation, request config
  lib/                    # env, prisma, queries (DAL), session, auth, validations
  messages/               # pt.json (typed translation catalog — PT-only)
  proxy.ts                # Next 16 proxy (next-intl locale negotiation)
prisma/                   # schema.prisma + seed.ts
```

Key design decisions:

- **White-label by config.** `src/config/site.ts` holds brand name, contact
  details, social links, navigation and the **theme palette**. Colours are
  injected as CSS custom properties at runtime (`ThemeStyle`), so re-skinning is
  a config edit — no component changes.
- **Content in the database, copy in catalogs.** UI strings live in
  `src/messages/pt.json` (type-checked against the catalog). Dynamic content
  (menu, gallery, testimonials) lives in Postgres with localized JSON fields
  resolved per request in the data-access layer (`src/lib/queries.ts`). The
  JSON shape still supports several locales (`LocalizedText`), the site just
  declares one.
- **Security boundary in the DAL.** Admin pages are guarded by `requireAdmin`
  (verifies the jose session + DB user). Server actions re-validate every input
  with the same zod schema used on the client.

## How the code works

Everything is organized around one principle: **three kinds of "content" live in
three different places**, so each is easy to change in isolation.

| Kind of content                          | Lives in                         | Why                                   |
| ---------------------------------------- | -------------------------------- | ------------------------------------- |
| **Brand identity** (name, colours, contact, socials, menu, opening hours) | `src/config/site.ts`            | Re-branding = editing one file        |
| **UI copy** (section titles, buttons, labels)              | `src/messages/pt.json`          | One catalog, easy to review           |
| **Dynamic content** (menu, gallery, testimonials) | PostgreSQL (entered via the admin) | Editable without touching code     |

### Request flow

```
Request  →  proxy.ts                 resolves the locale (pt is the only one, served at "/")
         →  app/[locale]/layout.tsx  loads fonts, injects brand colours, provides translations
         →  the page (Server Component)
              ├─ reads UI copy   via getTranslations() → src/messages/pt.json
              └─ reads content   via src/lib/queries.ts → PostgreSQL (resolved to the active locale)
         →  rendered HTML
```

### Layer responsibilities

- **`src/config/site.ts`** — the brand. Name, contact, WhatsApp, address, socials,
  navigation and the **theme palette**. `src/components/theme-style.tsx` turns the
  palette into CSS variables in `<head>`, so the colours defined here drive the
  whole site.
- **`src/i18n/`** — locale setup. `routing.ts` declares the locales; `proxy.ts`
  negotiates the locale per request; `request.ts` loads the right message file.
- **`src/messages/pt.json`** — every fixed string on the site, grouped by area
  (`home`, `about`, `reservas`, `contact`, `footer`, `admin`, …). Keys are
  type-checked.
- **`prisma/schema.prisma`** — the database tables. Localized fields (e.g. a
  gallery item's title) are stored as JSON `{ "pt": "…" }`.
- **`prisma/seed.ts`** — creates the first admin user, and nothing else. It
  seeds **no content**: the cardápio, galeria, avaliações and novidades are the
  restaurant's real content and are entered through the admin.
- **`src/lib/queries.ts`** — the data-access layer: reads published content and
  returns it already resolved to the active locale (view-ready objects).
- **`src/app/[locale]/(marketing)/`** — the public pages. The home page is
  assembled from blocks in **`src/components/sections/`** (hero, menu-preview,
  gallery-preview, testimonials, cta).
- **`src/app/[locale]/admin/`** — the login screen and the session-guarded
  dashboard: menu (cardápio), gallery, informations, testimonials and leads
  management.
- **`src/lib/{session,auth}.ts` + `src/app/actions/`** — auth (signed cookie via
  jose) and server actions (login, saving a lead, changing a lead's status).

## Lead notification & integrations

A contact-form submission is persisted first (durable), then best-effort
pushed to a **WhatsApp** group via the **Evolution API**
(`src/lib/lead-notify.ts`) — `LeadNotificationConfig` holds the target
instance and group, and the admin can also forward a lead manually. The
public submit endpoint is **rate-limited** per IP (**Upstash**/Vercel KV,
in-memory fallback). Full design in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); operational steps (connecting
WhatsApp, env vars) in [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

Integration env (all optional — features degrade gracefully when unset):
`EVOLUTION_BASE_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`,
`WHATSAPP_INBOX_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`.

## Customization guide

> Rule of thumb: **copy** lives in the message catalog; **the brand** lives in
> `src/config/site.ts`.

### Colours

`src/config/site.ts` → the `theme` object. The site is **dark-first**: the dark
palette is the default (it sits on bare `:root` in `theme-style.tsx`) and light
is the variant.

```ts
theme: {
  dark: {                        // o padrão
    brand: "#E68A08",
    brandForeground: "#171615",  // texto sobre o brand
    accent: "#E04F26",
    background: "#171615",
    foreground: "#EFE9C2",
  },
  light: { /* mesma marca em tom escurecido — ver o comentário no arquivo */ },
}
```

⚠️ **A paleta acima é herdada do projeto de origem** e está no repo só para o site
continuar renderizando. As cores do Restaurante Prato ainda não chegaram; a troca
é o PR 2.

Change these and the whole site re-colours — no CSS edits needed. The neutral
tokens (`card`, `muted`, `border`) live in `src/app/globals.css` and are warm on
purpose; a cool grey reads as dirty against the graphite and the cream.

Contrast is verifiable: `node docs/superpowers/specs/2026-08-07-palette-contrast.mjs`.

### Brand name, contact, socials, opening hours

Top of `src/config/site.ts`:

```ts
name: "Restaurante Prato",  // shown in the wordmark and page titles
foundedYear: 1998,          // drives the "X anos" copy
contact: { email, whatsapp, address },   // `phone` é opcional: pode não haver fixo
social:  {},                             // opcional: sem rede, `sameAs` some
openingHours?: { days, opens, closes },  // opcional: copy + schema.org
servesCuisine?: [...],                   // opcional: schema.org Restaurant
```

### Navigation menu

`src/config/site.ts` → the `nav` array (order + links). Changing it means three
coupled edits: the `NavKey` type, the `nav` keys in `src/messages/pt.json`, and
the route folders under `src/app/[locale]/(marketing)/`.

### Section titles, hero, buttons and all fixed text

`src/messages/pt.json`. For example:

- Hero slides → `home.hero.slides`
- "Nossa Gastronomia" title → `services.title`
- Buttons → `common.makeReservation`, `common.talkToUs`, …
- A Experiência page → `about.*`
- Horários & Reservas page → `reservas.*`

### Content (gallery, menu, testimonials)

**Through the admin** at `/admin`. There is **no seed script for any content** —
not for cardápio (`MenuCategory`/`MenuItem`), galeria (`GalleryPhoto`),
avaliações (`Testimonial`) or novidades (`Information`). `prisma/seed.ts`
creates the admin user and stops there; the bundled snapshot
(`prisma/backups/snapshot.sql`) likewise holds one admin user and zero content.
See [`SNAPSHOT.md`](SNAPSHOT.md).

> **A fresh database means an empty site — that is correct, not broken.** The
> public pages render their empty-state messages until you add content through
> the admin. This is deliberate: demo rows would be invented content on a real
> client's site.

### Logo — ainda não entregue

A logo do Restaurante Prato ainda não chegou, e os arquivos do cliente anterior
foram removidos do repo — exibi-los seria publicar a marca de outra empresa.

Até a nova chegar a marca é **tipográfica**: `src/components/layout/logo.tsx`
desenha `siteConfig.name` na serifada display que o site já carrega, e as rotas de
imagem (`src/app/icon.tsx`, `apple-icon.tsx`, `[locale]/opengraph-image.tsx`)
compõem com texto sobre o fundo escuro da marca. Os detalhes e o que fazer quando
a logo chegar estão em [`public/brand/`](public/brand/README.md).

Não existe `favicon.ico`; `src/app/icon.tsx` cobre todos os navegadores atuais.

### Photography — still a placeholder

`src/components/sections/hero.tsx` has an **empty** `slideImages` array and the
carousel falls back to a brand gradient. Drop three WebP files in `public/hero/`
and list them there. Slide 1 is the home page LCP, so keep it light.

### Images

To use images from another host, add the hostname to `images.remotePatterns` in
`next.config.ts`.

### Add a language

The site is intentionally Portuguese-only. To bring another one back:

1. Add the locale to `locales` in `src/i18n/routing.ts`.
2. Create `src/messages/<locale>.json`.
3. Add the locale key to every `LocalizedText` value (admin forms, DAL, tests —
   `prisma/seed.ts` has none, it only creates the admin user).
   `npm run typecheck` lists every place that needs it.
4. Re-add a locale switcher to the header (`git log` has the removed component).

### Quick reference

| I want to change…              | Go to…                                                            |
| ------------------------------ | ----------------------------------------------------------------- |
| Colours                        | `theme` in `src/config/site.ts`                                   |
| Name / contact / socials / hours | top of `src/config/site.ts`                                     |
| Menu items                     | `nav` + `NavKey` in `src/config/site.ts`, `nav` in `pt.json`, route folders |
| Section titles / button text   | `src/messages/pt.json`                                            |
| Gallery / cardápio / testimonials | the admin at `/admin` (no seed script for these)                |
| Logo                           | `public/brand/` (see its README) + `src/components/layout/logo.tsx` |
| Hero photos                    | `slideImages` in `src/components/sections/hero.tsx`               |
| Allowed image hosts            | `next.config.ts`                                                  |

## Getting started

### 1. Prerequisites

- Node.js ≥ 20.9
- A PostgreSQL database (a local one is provided via Docker)

### 2. Install & configure

```bash
npm install
```

There is **no `.env.example` in the repo** — write `.env` by hand (it is
git-ignored). The contract is `src/lib/env.ts`; the minimum for local dev:

```ini
DB_PORT=5433
DATABASE_URL="postgresql://agency:agency@localhost:5433/agency"
DIRECT_URL="postgresql://agency:agency@localhost:5433/agency"
SESSION_SECRET="<32+ chars — generate one, see below>"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

Generate a real `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database

Start the bundled Postgres, apply the schema and create the admin user:

```bash
docker compose up -d      # starts Postgres (host port from DB_PORT, default 5432)
npm run db:migrate        # create tables
npm run db:seed           # first admin user — no content is seeded
```

Alternatively, restore the committed dump, which is equivalent (schema up to
date, one admin user, no content):

```bash
npm run db:restore
npx prisma migrate status  # sanity check — should report "up to date"
```

Either way the site starts **empty**, showing its empty-state messages. That is
the intended state: add the cardápio, galeria, avaliações and novidades through
the admin at `/admin`.

> **Port note:** if you already run a local PostgreSQL on `5432`, set `DB_PORT`
> to a free port (e.g. `5433`) and point `DATABASE_URL` at it. The bundled
> `.env` is configured this way out of the box (`5433`).

The seed creates an admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
(defaults: `admin@example.com` / `changeme123`).

> ⚠️ `changeme123` is a local-only convenience. Never let it reach a public
> deploy — set both variables before seeding a real environment, or use
> `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:set-admin`. See
> [`docs/RUNBOOK.md`](docs/RUNBOOK.md) for how the first admin is created in
> production (the Vercel build does **not** run the seed).

### 4. Run

```bash
npm run dev
```

- Public site: <http://localhost:3000> (pt-BR — the only locale)
- Admin: <http://localhost:3000/admin> → redirects to `/admin/login`

## Scripts

| Script              | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the dev server (Turbopack)     |
| `npm run build`     | Production build                     |
| `npm run start`     | Serve the production build           |
| `npm run lint`      | ESLint (flat config)                 |
| `npm run typecheck` | `tsc --noEmit`                       |
| `npm run db:migrate`| Apply Prisma migrations (dev)        |
| `npm run db:seed`   | Create the first admin user (no content) |
| `npm run db:studio` | Open Prisma Studio                   |

## Notes

- Public content pages render dynamically (fresh from the CMS). Switch to ISR
  with `export const revalidate = N` per page if you prefer cached pages.
- `/admin` is excluded from `robots.txt` and marked `noindex`.
- The admin ships six sections — dashboard, cardápio (menu), galeria,
  novidades (informations), avaliações (testimonials) and contatos (leads) —
  all built as `(dashboard)` routes following the same DAL + zod pattern.
