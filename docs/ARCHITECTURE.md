# Architecture

How the n8x system fits together. For coding conventions see
[`AGENTS.md`](../AGENTS.md); for operations see [`RUNBOOK.md`](RUNBOOK.md).

## Big picture

```
                        ┌──────────────────────── Vercel (gru1) ────────────────────────┐
  Visitor ── HTTPS ──▶  │  Next.js 16 (App Router, RSC, Turbopack)                       │
                        │   • (marketing)  public site, SEO, JSON-LD                     │
                        │   • admin        login + session-guarded dashboard             │
                        │   server actions ── Prisma ─┐                                  │
                        └─────────────────────────────┼──────────────────────────────────┘
                                                       │ (pooled, pgbouncer, conn_limit=1)
                          Supabase Postgres  ◀─────────┘   DIRECT_URL (5432) for migrations
                                                       │
        external services (server-side only) ◀─────────┤
          • Evolution API (WhatsApp)  api.metodon8n.com.br  → send / instance mgmt
          • Upstash Redis (Vercel KV) per-IP rate limiting (in-memory fallback)
          • External inbox (link)     metodon8n / Chatwoot / Evo CRM  (no custom chat)
```

- **Hosting:** app on **Vercel** (region `gru1`), DB on **Supabase** (`sa-east-1`),
  domain at Hostinger. The app is **serverless** — no long-lived processes, so
  anything needing a persistent connection (Evolution, an inbox) is external.
- **Cache:** content reads go through the data-access layer with `unstable_cache`
  + tags; admin writes call `updateTag(...)`. On Vercel the cache is distributed,
  so admin edits propagate across instances.

## Layers

| Layer | Where | Notes |
|---|---|---|
| Routing / i18n | `src/proxy.ts`, `src/i18n/*` | next-intl, locale prefix `as-needed`; proxy excludes `/api` |
| Pages (RSC) | `src/app/[locale]/**` | route groups: `(marketing)`, `admin` |
| Server actions | `src/app/actions/**` | the write/command layer (auth-gated for admin) |
| Data access (DAL) | `src/lib/queries.ts`, `src/lib/admin-queries.ts` | cached public reads; admin reads |
| Integrations | `src/lib/evolution.ts`, `rate-limit.ts` | server-only |
| Validation | `src/lib/validations/*` (zod) | shared client form + server boundary |
| Config | `src/config/site.ts` | white-label brand + theme |

## Data model (Prisma — 8 models)

- **Marketing content:** `MenuCategory`, `MenuItem` (o cardápio), `GalleryPhoto`,
  `Information`, `Testimonial` — localized JSON fields resolved per request.
  `Testimonial` is a verifiable review (`source`/`sourceUrl` link back to where
  it was posted, e.g. Google) and renders on the page only — it never feeds
  the `Restaurant` JSON-LD (`src/components/json-ld.tsx`): Google forbids
  self-serving `Review`/`aggregateRating` about your own business on your own
  site.
- **Naming convention:** these model names are deliberately English while the
  routes they back are Portuguese — `Information` serves `/novidades`,
  `Testimonial` serves `/admin/testimonials` (label "Depoimentos"),
  `GalleryPhoto`/`MenuCategory`/`MenuItem` serve `/galeria`/`/cardapio`.
  Public surface and the i18n catalog (`pt.json`) are Portuguese; models,
  file names, functions, cache tags and Storage folders stay English. See
  `AGENTS.md` for the rationale.
- **Leads:** `Lead` (contact), `LeadNotificationConfig` (which instance +
  WhatsApp group receives new-lead notifications).
- **Auth:** `AdminUser` (admin login session).

## Lead notification

A contact-form submission is persisted first (durable), then best-effort
pushed to a WhatsApp group via `notifyLead()` (`src/lib/lead-notify.ts`):
rate-limit → validate → persist `Lead` → notify. The notify step runs in
`next/server`'s `after()`, so a slow/failing WhatsApp send never delays or
fails the visitor's submission. `LeadNotificationConfig` holds the target
instance and group; the admin can also forward a lead manually.

## Key decisions

Recorded as ADRs in [`docs/adr/`](adr/): Evolution vs Cloud API, Upstash for
rate limiting, selectable WhatsApp instance, CSP deferred, external inbox
instead of a custom one.
