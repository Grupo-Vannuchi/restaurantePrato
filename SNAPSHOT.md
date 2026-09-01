# System snapshot — restore / "initiate the system"

This repo has a saved restore point: the committed code **plus** a database dump
at [`prisma/backups/snapshot.sql`](prisma/backups/snapshot.sql) (~18 KB).

Snapshot contents (data): **one admin user (`admin@example.com`) and nothing
else.** Every content table — `informations`, `menu_categories`, `menu_items`,
`gallery_photos`, `testimonials`, `leads`, `lead_notification_config` — is
empty.

**The empty site is correct, not a broken environment.** Cardápio, galeria,
avaliações and novidades are the restaurant's real content and are entered
through the admin panel at `/admin`. Seeded demo rows would be invented content
on a real client's site, so there are none. Restore this dump, start the app,
and the public pages render their empty-state messages (`cardapio.empty`,
`galeria.empty`, `novidades.empty`) — that is the expected result.

The dump carries the full schema: **9 tables** — the 8 Prisma models
(`AdminUser`, `Information`, `Testimonial`, `MenuCategory`, `MenuItem`,
`GalleryPhoto`, `Lead`, `LeadNotificationConfig`) plus `_prisma_migrations`
with all **22 migrations** recorded, so `npx prisma migrate status` reports
up to date immediately after restoring.

> ⚠️ **This dump is for local development only.** It contains the placeholder
> admin `admin@example.com` with the default password `changeme123`. Never load
> it into a production database — see *Production deploy* below for how the
> first admin is created there.

**About the `snapshot-2026-06-09` git tag:** it still exists, but it is **stale
and does not describe this restore point.** It points at commit `4320b52`
(2026-06-09), well over a hundred commits behind, whose `snapshot.sql` is the old ~302 KB dump
of the agency's demo data against a schema that no longer exists. Treat the tag
as history, not as a restore target; the current restore point is simply the
committed `snapshot.sql` on `Development`.

## Initiate the system (bring it back exactly)

```bash
docker compose up -d          # start Postgres (container n8x-marketing-db, host port 5433)
npm install                   # only if node_modules is missing
npm run db:generate           # generate the Prisma client
npm run db:restore            # load prisma/backups/snapshot.sql (drops + recreates the objects)
npx prisma migrate status     # sanity check — should report "up to date"
npm run dev                   # http://localhost:3000
```

Admin login: `admin@example.com` / `changeme123` at `/admin`.

> Requires the local `.env` with `DATABASE_URL` (git-ignored, stays on the machine).
> To restore onto a *different* machine, recreate `.env` first.

## Rebuild from migrations instead of the dump (optional)

If you'd rather build the database from code (e.g. a fresh DB, no dump):

```bash
npm run db:migrate            # apply schema (prisma migrate dev — local only)
npm run db:seed               # creates the admin user, and only the admin user
```

`prisma/seed.ts` seeds **no content at all** — no cardápio, galeria,
avaliações or novidades. That is deliberate (see above). The result is
identical to restoring the dump.

> ⚠️ The seed falls back to `admin@example.com` / `changeme123` when
> `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` are unset. Fine locally, never
> acceptable anywhere public.

## Re-save a new snapshot later

```bash
npm run db:dump               # overwrites prisma/backups/snapshot.sql
git add -A && git commit -m "snapshot: <what changed>"
```

Re-dumping a database that has real client content will commit that content to
the repo — check what you are capturing before committing.

## Production deploy — Supabase (DB) + Vercel (app)

Prisma uses **two** connections: `DATABASE_URL` (runtime) and `DIRECT_URL`
(migrations) — see `src/lib/env.ts` and `prisma/schema.prisma`.

1. **Supabase**: create the project; from Connect → ORMs → Prisma,
   take the **pooled** URL (port 6543, with `?pgbouncer=true`) for `DATABASE_URL`
   and the **session pooler** URL (port 5432) for `DIRECT_URL`. URL-encode special
   chars in the password (e.g. `@` → `%40`). Region used: `sa-east-1` (São Paulo).
   Create the public `media` bucket in Storage (admin image uploads need it).
2. **Vercel**: import the GitHub repo. `postinstall` runs `prisma generate`;
   [`vercel.json`](vercel.json) pins the app to the `gru1` (São Paulo) region and
   sets `buildCommand` to `npx prisma migrate deploy && next build`, so the
   **schema is created by the build**. Set the env vars (`DATABASE_URL`,
   `DIRECT_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_SITE_URL`) in Project Settings →
   Environment Variables. `NEXT_PUBLIC_SITE_URL` is inlined at build time, so set
   it before the first build.
3. **Create the first admin — a manual step the build does not do.** The build
   runs `migrate deploy` and nothing else; **the seed is never invoked on
   Vercel**, and `migrate deploy` does not seed. A freshly deployed environment
   therefore has the schema and *zero* admin users, and nobody can log in until
   someone creates one. Do it from a machine pointed at the production database:

   ```bash
   DATABASE_URL="<production DIRECT_URL>" \
   ADMIN_EMAIL="…" ADMIN_PASSWORD="…" npm run db:set-admin
   ```

   `npm run db:set-admin` (`prisma/set-admin.ts`) requires both variables,
   rejects passwords under 8 characters, and deletes the `admin@example.com`
   placeholder if it exists. Prefer it. A manual `npm run db:seed` also works,
   but **only** with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` set — without
   them it silently creates `admin@example.com` / `changeme123`.
4. **Do not load `prisma/backups/snapshot.sql` into production.** It is the
   local restore point and carries the placeholder admin. Production gets its
   schema from `migrate deploy` and its content from the admin panel.
5. **Domain**: the restaurant's final domain is still undefined — it is one of
   the `«PENDENTE»` fields in `src/content/legal.ts`. Once it is decided, add it
   in Vercel Project → Settings → Domains, set the DNS records it shows at the
   registrar, and update `NEXT_PUBLIC_SITE_URL` (it feeds canonical, sitemap,
   robots and OG).

> On Vercel the content cache (`revalidateTag`/`updateTag`) is handled by Vercel's
> distributed cache, so admin edits propagate across all serverless instances — no
> single-instance constraint like a self-hosted Node process would have.
