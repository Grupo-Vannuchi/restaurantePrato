import { z } from "zod";

import { impedimentoParaIndexar, pendenciasLegais } from "@/content/legal";

/**
 * Centralised, validated access to environment variables.
 *
 * Importing `env` anywhere guarantees the required variables exist and have the
 * right shape — the process fails fast at boot instead of throwing deep inside a
 * request. Only `NEXT_PUBLIC_*` values are safe to read in the browser; the rest
 * are server-only and must never be imported into a Client Component.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),
  // Direct (non-pooled) connection for Prisma Migrate. Only used by the Prisma
  // CLI, not at runtime — optional so the app still boots without it.
  DIRECT_URL: z
    .string()
    .url("DIRECT_URL must be a valid connection string")
    .optional(),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters for HS256 signing"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  /**
   * Search-engine visibility switch. **Defaults to `false` — the site ships
   * closed.** A forgotten variable must leave the site out of the index, never
   * in it: a preview deployment indexed under the wrong host takes weeks to
   * remove. Publishing for real is an explicit `SITE_INDEXABLE=true` plus a
   * redeploy (both `robots.txt` and the root metadata are baked at build time).
   *
   * Parsed as a literal `"true"`/`"false"` string and compared explicitly.
   * `z.coerce.boolean()` must never be used here: env values are always
   * strings and `Boolean("false") === true`, which fails in the dangerous
   * direction — the site would report itself closed while standing wide open.
   * Any other value is a hard boot error, so a typo can't silently publish.
   */
  SITE_INDEXABLE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  // --- Integrations (optional — degrade gracefully when unset) ---------------
  // Evolution API (WhatsApp) for lead-notification message sends.
  EVOLUTION_BASE_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().min(1).optional(),
  EVOLUTION_INSTANCE: z.string().min(1).optional(),
  // External conversation inbox (the dedicated chat UI — metodon8n now,
  // Chatwoot/Evo CRM once self-hosted). Linked from the admin WhatsApp panel.
  WHATSAPP_INBOX_URL: z.string().url().optional(),
  // Upstash Redis (Vercel Marketplace, "KV" prefix) for durable rate limiting.
  // When absent (e.g. local dev), the limiter falls back to in-memory.
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().min(1).optional(),
  // Supabase Storage for admin image uploads (server-only). Base project URL +
  // a secret key (`sb_secret_…` or the legacy service_role). When unset, uploads
  // are disabled and the URL fields still work. Never NEXT_PUBLIC — server only.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  /**
   * Name of the public Storage bucket the uploads land in. A bucket name is
   * deployment configuration, not a code constant: each Supabase project can
   * name it differently, and hardcoding one client's name breaks every other
   * deployment. Defaults to `media` — the bucket `docs/RUNBOOK.md` tells you
   * to create — so a setup that follows the runbook needs no configuration at
   * all. An empty value is treated as unset so a blank line in `.env` falls
   * back to the default instead of failing the boot.
   */
  SUPABASE_BUCKET: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || "media"),
});

const clientSchema = z.object({
  /*
   * ───────────────────────────────────────────────────────────────────────
   *  INSTAGRAM — Instagram API with Instagram Login
   * ───────────────────────────────────────────────────────────────────────
   * Sem `NEXT_PUBLIC_`, e isso é o ponto: `NEXT_PUBLIC_*` vai para o
   * navegador, e um token de leitura publicado é um token vazado. Toda chamada
   * à Meta acontece no servidor.
   *
   * Ausente = integração desligada. O site continua funcionando e a seção
   * simplesmente não aparece — é o estado em que o Prato nasce, porque as
   * credenciais ainda não vieram.
   */
  INSTAGRAM_ACCESS_TOKEN: z.string().min(1).optional(),
  /** ID numérico da conta profissional, de `GET /me?fields=id`. */
  INSTAGRAM_USER_ID: z.string().min(1).optional(),
  /**
   * Versão da Graph API. Fixada em vez de "a mais recente" porque a Meta
   * descontinua versões em janela conhecida: subir a versão passa a ser uma
   * mudança deliberada, com teste, e não uma quebra numa terça-feira.
   */
  INSTAGRAM_API_VERSION: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || "v25.0"),
  /** Quantos posts exibir. Quatro cabem numa linha no desktop. */
  INSTAGRAM_POST_LIMIT: z.coerce.number().int().min(1).max(24).default(4),
  /**
   * Mostra quadros vazios no lugar do feed, para conferir o layout enquanto as
   * credenciais não existem. Só tem efeito fora de produção — **nunca** desenha
   * post falso no site publicado.
   */
  INSTAGRAM_PREVIEW: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL must be an absolute URL")
    .default("http://localhost:3000"),
});

function formatErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

const isServer = typeof window === "undefined";

function parseServerEnv() {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${formatErrors(parsed.error)}`,
    );
  }
  return parsed.data;
}

function parseClientEnv() {
  // NEXT_PUBLIC_* values are statically inlined by Next, so reference them directly.
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid public environment variables:\n${formatErrors(parsed.error)}`,
    );
  }
  return parsed.data;
}

const clientEnv = parseClientEnv();

/**
 * Server env is only validated on the server. On the client the server fields
 * are left undefined (and must never be accessed there).
 */
export const env = {
  ...clientEnv,
  ...(isServer ? parseServerEnv() : ({} as ReturnType<typeof parseServerEnv>)),
};

/**
 * Tranca de lançamento: abrir aos buscadores com documento legal incompleto
 * derruba a construção do site.
 *
 * `src/content/legal.ts` marca com `«PENDENTE: …»` cada dado do cliente que
 * ainda não chegou, em vez de preencher por aproximação — dado de outra empresa
 * num documento de LGPD é pior que campo em branco. O aviso de "não publicar
 * enquanto houver pendência" existia como comentário, e comentário não impede
 * ninguém.
 *
 * Roda aqui porque este módulo é lido durante o `build` (o `robots.ts` e o
 * layout raiz importam `env`), então a falha aparece na construção — antes de
 * existir uma página indexada. Errar na outra direção não custa retrabalho,
 * custa retirada: página indexada leva semanas para sair do índice, e nesse
 * meio-tempo ela é o documento legal do cliente.
 */
if (isServer) {
  const impedimento = impedimentoParaIndexar(env.SITE_INDEXABLE, pendenciasLegais());
  if (impedimento) throw new Error(impedimento);
}
