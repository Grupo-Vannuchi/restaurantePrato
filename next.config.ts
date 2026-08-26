import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * O servidor de desenvolvimento do Next avalia código em runtime (React Fast
 * Refresh) e conversa por WebSocket com o navegador. Produção não faz nem uma
 * coisa nem outra — daí as duas frouxidões abaixo valerem só aqui.
 */
const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy — parcial, e parcial de propósito.
 *
 * A ADR-0004 adiou a CSP inteira porque `script-src` sem `'unsafe-inline'`
 * exige um nonce por requisição, e nonce por requisição tira do modo estático
 * as 31 páginas que hoje são pré-renderizadas. Esse continua sendo o trabalho
 * pendente, e é o único que mitiga XSS.
 *
 * O que **não** dependia disso, e portanto entra agora, fecha ataques reais:
 *
 * - `base-uri`: sem ela, um `<base>` injetado reescreve o destino de toda URL
 *   relativa da página — incluindo o do formulário de contato.
 * - `form-action`: prende o envio de formulário à própria origem, então nem
 *   um formulário injetado consegue postar os dados do visitante noutro lugar.
 * - `frame-ancestors`: a versão moderna do X-Frame-Options, que o header
 *   antigo já cobre nos navegadores atuais mas não nas especificações novas.
 * - `object-src`: mata `<object>`/`<embed>`, que este site não usa.
 * - `default-src`: tudo que não tem direção própria cai em `'self'`.
 *
 * ⚠️ `script-src` traz `'unsafe-inline'` e por isso **não protege contra XSS**.
 * Ele está aqui porque `default-src 'self'` sozinho bloquearia o JSON-LD e os
 * scripts de hidratação do Next — ou seja, é o que impede a CSP de quebrar o
 * site, não uma proteção. A ADR-0004 segue aberta nessa parte.
 *
 * `img-src` precisa concordar com o `remotePatterns` lá embaixo; `blob:` é o
 * preview local da imagem no upload do admin, antes de ela existir no Storage.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? " ws: http://localhost:*" : ""}`,
  // O rodapé embute o mapa do Google (`mapEmbedUrl()` em config/site.ts) num
  // iframe, em toda página. Sem esta direção ele cai na `default-src` e o
  // navegador recusa o quadro: o mapa vira um retângulo vazio, e nada no
  // servidor acusa. `maps.google.com` é o endereço que o código monta;
  // `www.google.com` é para onde o Google redireciona o embed.
  "frame-src https://maps.google.com https://www.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/**
 * Baseline security headers applied to every response. These are the "safe"
 * set that never breaks rendering.
 */
const securityHeaders = [
  // Force HTTPS for two years (ignored on http/localhost by browsers).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Disallow being embedded in an <iframe> (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Don't let browsers MIME-sniff responses away from their declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send origin only on cross-origin navigations.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful features the site doesn't use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  // Admin image uploads go through a Server Action; the default 1MB body cap is
  // too small for a phone photo. Match the action's 15MB limit (+ FormData
  // overhead). Only admins (session-gated) can hit the upload action.
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // Toda imagem autorizada precisa existir também na `img-src` da CSP, acima.
    //
    // Os bancos de imagem que o fork trazia (Unsplash, Picsum, LoremFlickr)
    // saíram: eles serviam o conteúdo de demonstração da agência, e aqui a
    // regra é foto autoral do restaurante. Enquanto estivessem autorizados,
    // bastava colar uma URL de banco de imagens num campo do painel para
    // publicar foto genérica como se fosse da casa.
    // AVIF primeiro: o navegador escolhe o primeiro formato que aceita, e AVIF
    // costuma ser 20–30% menor que WebP na mesma qualidade — diferença maior
    // justamente em foto de comida, que tem gradação suave. O padrão do Next é
    // só WebP, então isto não vinha de graça.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Google Drive images: use the lh3.googleusercontent.com/d/<FILE_ID> form,
      // NOT the drive.google.com/file/d/<ID>/view share link.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Supabase Storage (admin image uploads) — the project's public bucket.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default withNextIntl(nextConfig);
