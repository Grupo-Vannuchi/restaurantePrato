import { describe, expect, it } from "vitest";

import nextConfig from "../next.config";

/**
 * Guarda dos cabeçalhos de segurança e das fontes de imagem autorizadas.
 *
 * Os dois assuntos vivem no mesmo arquivo e se sustentam: a `img-src` da CSP só
 * faz sentido se concordar com o `remotePatterns`, que é quem o Next consulta
 * para otimizar imagem remota. Divergência entre os dois produz o pior tipo de
 * falha — a foto some no navegador do visitante e o build passa verde.
 */

async function headersFor(path: string) {
  const groups = await nextConfig.headers!();
  const match = groups.filter(
    (group) => group.source === "/:path*" || group.source === path,
  );
  return Object.fromEntries(
    match.flatMap((group) => group.headers.map((h) => [h.key, h.value])),
  ) as Record<string, string>;
}

describe("cabeçalhos de segurança", () => {
  it("mantém a base que nunca quebra renderização", async () => {
    const headers = await headersFor("/");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("declara uma Content-Security-Policy", async () => {
    const headers = await headersFor("/");
    expect(headers["Content-Security-Policy"]).toBeDefined();
  });

  it("fecha as direções que não dependem de nonce", async () => {
    const csp = (await headersFor("/"))["Content-Security-Policy"];
    // Nenhuma destas afeta script inline, e cada uma fecha um ataque real:
    // `base-uri` impede reescrever a base das URLs relativas da página,
    // `form-action` impede sequestrar o destino do formulário de contato,
    // `frame-ancestors` é a versão moderna do X-Frame-Options e
    // `object-src` mata <object>/<embed>, que ninguém usa aqui.
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("autoriza as imagens do Storage do Supabase", async () => {
    const csp = (await headersFor("/"))["Content-Security-Policy"];
    expect(csp).toMatch(/img-src[^;]*\*\.supabase\.co/);
  });

  it("não libera 'unsafe-eval' fora do desenvolvimento", async () => {
    // O Next usa eval no servidor de desenvolvimento e não em produção. O
    // cabeçalho é montado uma vez, na importação do config, então esta asserção
    // vale para o ambiente de teste — que é o de produção para este efeito.
    const csp = (await headersFor("/"))["Content-Security-Policy"];
    expect(csp).not.toContain("unsafe-eval");
  });
});

describe("fontes de imagem autorizadas", () => {
  const hosts = () =>
    (nextConfig.images?.remotePatterns ?? []).map((p) =>
      typeof p === "string" ? p : String(p.hostname),
    );

  it("não autoriza banco de imagens", () => {
    // A regra do projeto é foto autoral. Enquanto estes hosts estivessem
    // autorizados, bastava colar uma URL de banco de imagens num campo do
    // painel para publicar foto genérica como se fosse da casa.
    expect(hosts()).not.toContain("images.unsplash.com");
    expect(hosts()).not.toContain("picsum.photos");
    expect(hosts()).not.toContain("loremflickr.com");
  });

  it("autoriza o Storage do Supabase", () => {
    expect(hosts()).toContain("*.supabase.co");
  });
});
