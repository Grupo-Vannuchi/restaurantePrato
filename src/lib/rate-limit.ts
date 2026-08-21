import "server-only";
import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

/**
 * Best-effort rate limiting. Uses Upstash Redis (durable, shared across all
 * serverless instances) when `KV_REST_API_URL`/`KV_REST_API_TOKEN` are set;
 * otherwise falls back to a per-instance in-memory window (fine for local dev,
 * weak on serverless). Fails OPEN: if the limiter errors, the request is allowed
 * — protection should never take the form down.
 */

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

const upstashConfigured = Boolean(
  env.KV_REST_API_URL && env.KV_REST_API_TOKEN,
);

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, limit: number, windowSeconds: number): Ratelimit {
  const key = `${name}:${limit}:${windowSeconds}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    redis ??= new Redis({
      url: env.KV_REST_API_URL!,
      token: env.KV_REST_API_TOKEN!,
    });
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `rl:${name}`,
      analytics: false,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

// --- In-memory fallback (fixed window, per instance) ---
const memStore = new Map<string, { count: number; reset: number }>();

// Exported for unit testing — pure given `now`, so the fixed-window behaviour
// (allow-up-to-limit, retryAfter, reset) can be asserted deterministically.
export function memLimit(key: string, limit: number, windowMs: number, now: number): RateLimitResult {
  // Opportunistic cleanup so the map can't grow unbounded.
  if (memStore.size > 5000) {
    for (const [k, v] of memStore) if (v.reset <= now) memStore.delete(k);
  }
  const entry = memStore.get(key);
  if (!entry || entry.reset <= now) {
    memStore.set(key, { count: 1, reset: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true };
}

/**
 * Check a rate limit for `identifier` (e.g. an IP) under a named bucket.
 * `now` is passed in to keep this pure-ish and testable; callers pass Date.now().
 */
export async function rateLimit(
  name: string,
  identifier: string,
  opts: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const now = Date.now();
  try {
    if (upstashConfigured) {
      const { success, reset } = await getLimiter(
        name,
        opts.limit,
        opts.windowSeconds,
      ).limit(identifier);
      return success
        ? { ok: true }
        : { ok: false, retryAfter: Math.max(0, Math.ceil((reset - now) / 1000)) };
    }
    return memLimit(`${name}:${identifier}`, opts.limit, opts.windowSeconds * 1000, now);
  } catch (error) {
    // Fail open — never block a real user because the limiter is unavailable.
    console.error("rateLimit error (allowing request)", error);
    return { ok: true };
  }
}

/**
 * IP do cliente, lido dos cabeçalhos do proxy.
 *
 * ⚠️ **Pegar o primeiro item do `x-forwarded-for` só é seguro porque isto roda
 * na Vercel.** O cabeçalho é escrito pelo cliente em muitas hospedagens, e
 * proxies que apenas *acrescentam* deixam o valor do atacante na frente — ali o
 * primeiro item é justamente o que não se pode acreditar, e todo freio por IP
 * (contato e login) vira decoração: basta girar o cabeçalho a cada tentativa.
 *
 * A Vercel não acrescenta, sobrescreve. A documentação é explícita: "Vercel
 * overwrites this header and does not forward external IPs to prevent
 * spoofing" — a exceção é o *trusted proxy* de contas Enterprise, que este
 * projeto não usa (https://vercel.com/docs/headers/request-headers).
 *
 * Ou seja: a garantia é da hospedagem, não do código. **Sair da Vercel — para
 * um Node atrás de nginx, por exemplo — quebra os dois freios em silêncio**,
 * sem erro de build, sem teste vermelho e sem nada na tela. Nesse dia, troque
 * por um IP vindo do proxy confiável (o item mais à direita, contando os saltos
 * conhecidos) antes de subir.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}
