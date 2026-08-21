import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A trava de lançamento tem que alcançar TODA rota que publica mapa do site.
 *
 * `SITE_INDEXABLE=false` fecha o site aos buscadores enquanto `legal.ts` ainda
 * tem `«PENDENTE»` — o motivo é jurídico, não estético. Mas a trava só era lida
 * em dois lugares: o `robots.txt` e o `noindex` das páginas. `/sitemap.xml`,
 * `/llms.txt` e `/llms-full.txt` continuavam servindo tudo, e foi verificado
 * contra o site publicado: `robots.txt` respondia `Disallow: /` (27 bytes)
 * enquanto `/llms.txt` entregava 677 bytes com nome, endereço, horário e o mapa
 * das páginas.
 *
 * O próprio comentário do `robots.ts` já tinha enunciado a regra ao explicar por
 * que a linha `Sitemap:` não sai de lá: "anunciar uma lista de URLs enquanto se
 * pede para não ser rastreado é contraditório, e alguns rastreadores buscam o
 * sitemap de qualquer jeito". Tirar a *referência* não adianta quando o arquivo
 * segue de pé no caminho conhecido — `/sitemap.xml` e `/llms.txt` são
 * convenções: ninguém precisa que apontem para eles.
 */

const ENV_FECHADO = { SITE_INDEXABLE: false, NEXT_PUBLIC_SITE_URL: "https://exemplo.test" };
const ENV_ABERTO = { SITE_INDEXABLE: true, NEXT_PUBLIC_SITE_URL: "https://exemplo.test" };

const CONTEUDO = {
  getMenu: async () => [
    { slug: "principais", name: "Principais", description: "Do dia", items: [] },
  ],
  getInformations: async () => [
    { slug: "nota", title: "Nota", excerpt: "resumo", body: "corpo", createdAt: new Date(0) },
  ],
  getInformationSitemapEntries: async () => [
    { slug: "nota", updatedAt: new Date(0) },
  ],
};

/** Carrega uma rota com o `env` pedido, num registro de módulos limpo. */
async function carregar<T>(modulo: string, env: object): Promise<T> {
  vi.resetModules();
  vi.doMock("@/lib/env", () => ({ env }));
  vi.doMock("@/lib/queries", () => CONTEUDO);
  return (await import(modulo)) as T;
}

beforeEach(() => {
  vi.resetModules();
  vi.doUnmock("@/lib/env");
  vi.doUnmock("@/lib/queries");
});

describe("com o site fechado aos buscadores", () => {
  it("o sitemap não anuncia URL nenhuma", async () => {
    const { default: sitemap } = await carregar<{
      default: () => Promise<unknown[]>;
    }>("@/app/sitemap", ENV_FECHADO);

    expect(await sitemap()).toEqual([]);
  });

  it("o /llms.txt não entrega o mapa", async () => {
    const { GET } = await carregar<{ GET: () => Promise<Response> }>(
      "@/app/llms.txt/route",
      ENV_FECHADO,
    );
    const res = await GET();

    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain("Augusto Severo");
  });

  it("o /llms-full.txt não entrega o conteúdo", async () => {
    const { GET } = await carregar<{ GET: () => Promise<Response> }>(
      "@/app/llms-full.txt/route",
      ENV_FECHADO,
    );
    const res = await GET();

    expect(res.status).toBe(404);
  });
});

describe("com o site aberto aos buscadores", () => {
  it("o sitemap volta a listar as páginas", async () => {
    const { default: sitemap } = await carregar<{
      default: () => Promise<unknown[]>;
    }>("@/app/sitemap", ENV_ABERTO);

    // Sentinela: se a trava passar a fechar sempre, o teste acima passaria
    // vacuamente e ninguém notaria que o sitemap morreu no dia do lançamento.
    expect((await sitemap()).length).toBeGreaterThan(5);
  });

  it("o /llms.txt volta a responder", async () => {
    const { GET } = await carregar<{ GET: () => Promise<Response> }>(
      "@/app/llms.txt/route",
      ENV_ABERTO,
    );
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Restaurante Prato");
  });
});
