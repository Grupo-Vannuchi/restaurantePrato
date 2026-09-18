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
     * ⚠️ **AVIF VOLTOU em 18/09/2026, e o que saiu daqui foi uma justificativa
     * errada em DOIS pontos — não uma medição que envelheceu.**
     *
     * Ele foi removido em 15/09 com duas razões, e as duas caíram:
     *
     * **1. "Não economiza nada aqui" — a medição foi na QUALIDADE ERRADA.** A
     * tabela que morava aqui dizia 0% na mesma largura e "mesma qualidade", e
     * estava certa: em **q=75**. Só que este projeto serve as fotos em **q=50**
     * — cinco superfícies declaram `quality={50}` — e ali o AVIF é 2 a 2,8
     * vezes menor. Medido pelo otimizador, mesmo arquivo, mesma largura:
     *
     *                                  q=75            q=50
     *   hero/buffet-quente   1080   1,00x  (empate)   2,12x
     *   hero/churrasco        1080   1,11x            2,23x
     *   massas/tres-massas    1080   1,13x            2,50x
     *   massas/tres-massas    1920   1,05x            2,79x
     *
     * A tabela antiga não estava mentindo sobre os bytes; ela media uma
     * qualidade que a página não usa.
     *
     * **2. "O otimizador trava no AVIF" — o travamento NÃO é do AVIF.** Em
     * 18/09 ele foi reproduzido no caminho **WebP**, com o AVIF já desligado:
     * `/_next/image?url=/hero/churrasco-na-brasa.webp&w=1080&q=50` não voltou
     * depois de 120 s, enquanto 640, 750, 828, 1200 e 1920 do MESMO arquivo
     * voltaram em milissegundos, uma largura fria (w=384) em 27 ms, e o `sharp`
     * sozinho fez a conversão em 0,11 s.
     *
     * A causa é outra, e é em MEMÓRIA: reiniciando o servidor sem apagar
     * `.next`, a mesma URL volta em 0,30 s. Uma otimização em voo **abortada**
     * — e a suíte de testes abre e fecha páginas o tempo todo — deixa a entrada
     * pendurada no mapa de deduplicação do otimizador, e toda requisição
     * seguinte da mesma chave espera por ela para sempre. O que muda entre uma
     * execução e outra é a CHAVE, não o formato.
     *
     * Ou seja: manter o AVIF desligado nunca protegeu de nada. O que protege é
     * saber que uma requisição abortada envenena a chave até o processo
     * reiniciar — na Vercel, até a instância reciclar.
     *
     * ── A condição de reabertura, cumprida ────────────────────────────────
     *
     * O texto anterior exigia: "pedir todas as larguras do `srcset` de cada
     * imagem de marca, com `Accept: image/avif`, com cache frio, e nenhuma
     * pendurar". Feito em 18/09, com `.next` apagado e servidor recém-subido —
     * as 5 imagens de `public/brand` × as 8 larguras de `imageSizes`, 40
     * requisições, nenhuma pendurada. O registro está no commit.
     *
     * ⚠️ **E o projeto irmão é a referência que o cliente pediu: lá o AVIF está
     * LIGADO.** Mas ele não colhe nada com isso, e a razão é instrutiva — o
     * irmão não declara `images.qualities`, então todo `quality` que um
     * componente peça é ignorado e tudo sai em q=75, exatamente onde AVIF e
     * WebP empatam. A marca dele também é **SVG**, que não passa pelo
     * otimizador. Aqui a marca é PNG e as fotos saem em q=50: é o Prato que
     * tem o que ganhar.
     *
     * ⚠️ A armadilha que continua valendo: a largura pedida depende do `sizes`,
     * então **mexer no layout sorteia combinações de (arquivo, largura) novas**.
     * Foi assim que o site parou de carregar em 15/09 — corrigir o `sizes` da
     * marca fez o navegador pedir w=128 pela primeira vez.
     */
    formats: ["image/avif", "image/webp"],
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
