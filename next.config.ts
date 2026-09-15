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
  // O Next anuncia `X-Powered-By: Next.js` por padrão. Os ~25 bytes não pesam;
  // dizer a quem varre a internet qual pilha rodar exploit contra é que não
  // precisa. Medido: na Vercel o cabeçalho nem chega ao visitante, mas rodando
  // o mesmo código localmente ele aparece — a proteção é da hospedagem, não do
  // código, e sair dela o traria de volta sem nada acusar.
  poweredByHeader: false,
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
    /*
     * ⚠️ **AVIF SAIU em 15/09, e a razão é um travamento medido — não gosto.**
     *
     * O comentário anterior aqui dizia que "AVIF costuma ser 20–30% menor que
     * WebP na mesma qualidade, diferença maior justamente em foto de comida".
     * Isso é verdade em geral e **falso para os arquivos deste projeto**, porque
     * as fontes já são WebP. Medido, mesma largura e mesma qualidade:
     *
     *   hero/buffet-quente  1920 ... AVIF 221.383 B · WebP 221.030 B ...  0%
     *   massas/fettuccine   1080 ... AVIF  76.504 B · WebP  76.292 B ...  0%
     *   galeria/churrasco    640 ... AVIF  19.005 B · WebP  20.010 B ... +5%
     *   brand/wordmark       384 ... AVIF  16.347 B · WebP  17.956 B ... +9%
     *
     * Zero nas duas pesadas, que são as que decidem o tempo de pintura.
     *
     * ── O que o AVIF custava ──────────────────────────────────────────────
     *
     * O otimizador do Next **trava indefinidamente** ao produzir AVIF para
     * certas combinações de (arquivo, largura): sem resposta, sem erro, sem uma
     * linha no log. Reproduzido, determinístico, com cache frio e quente:
     *
     *   brand/logo.png        w=128  ... TRAVA  ·  w=256 responde em 63 ms
     *   brand/logo-claro.png  w=384  ... TRAVA  ·  w=128 responde em  3 ms
     *
     * A mesma requisição em WebP volta em 25 ms. O `sharp` sozinho converte
     * TODAS as combinações em menos de 1,3 s, então o defeito está no caminho
     * do otimizador, não no encoder nem no arquivo.
     *
     * O dano não é a imagem que falta: a marca do cabeçalho é `priority`, então
     * a requisição pendurada **impede o evento `load` da página** e derruba
     * qualquer medição de navegador naquela rota. Custou duas tardes — em 14/09
     * eu atribuí isso a apagar `.next/cache/images` com o servidor no ar e
     * generalizei de dois pontos de dados; em 15/09 reproduziu num servidor
     * recém-subido, com cache criado por ele mesmo.
     *
     * ⚠️ E a armadilha é pior que "uma imagem trava": a largura pedida depende
     * do `sizes`, então **mexer no layout sorteia combinações novas**. Foi o que
     * aconteceu: corrigir o `sizes` da marca em 14/09 fez o navegador pedir
     * w=128 pela primeira vez, e o site parou de carregar no dia seguinte.
     *
     * Para voltar a ligar o AVIF é preciso que isto passe: pedir todas as
     * larguras do `srcset` de cada imagem de marca, com `Accept: image/avif`,
     * com cache frio, e nenhuma pendurar.
     */
    formats: ["image/webp"],
    // ⚠️ **No Next 16 esta lista é obrigatória, e o que ficar fora dela é
    // ignorado EM SILÊNCIO.** O padrão é `[75]`: um `quality={50}` num
    // componente não vira erro nem aviso, a imagem sai em 75 e o autor conclui
    // que a qualidade não muda o peso. Foi exatamente o que aconteceu ao medir
    // o hero em 04/09 — o número não mexia porque o valor nunca chegava ao
    // otimizador. O campo virou obrigatório por segurança: sem lista, alguém de
    // fora pediria mil qualidades diferentes e cada uma viraria um arquivo novo
    // no cache.
    qualities: [50, 75],
    remotePatterns: [
      // CDN de mídia do Instagram. Só os dois hosts que a Graph API devolve em
      // `media_url`/`thumbnail_url` — liberar `*.fbcdn.net` inteiro abriria a
      // otimização de imagem para qualquer conteúdo hospedado pela Meta.
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "scontent.cdninstagram.com" },
      // Google Drive images: use the lh3.googleusercontent.com/d/<FILE_ID> form,
      // NOT the drive.google.com/file/d/<ID>/view share link.
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Supabase Storage (admin image uploads) — the project's public bucket.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default withNextIntl(nextConfig);
