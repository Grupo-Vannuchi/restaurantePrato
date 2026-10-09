import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MetadataRoute } from "next";

/**
 * As 29 fotos autorais da galeria entram no mapa do site como sitemap de imagem.
 *
 * **Por que vale.** São fotos próprias do buffet, da brasa e das massas, cada
 * uma com `figcaption`. Busca de imagem, para restaurante, é intenção de
 * almoço — alguém procurando "buffet por quilo Santos" nas imagens está a um
 * clique de vir. Sem a declaração, o rastreador só encontra essas fotos se
 * decidir rastrear a página inteira e interpretar a grade por conta própria.
 *
 * O Next 16 emite isto pela propriedade `images` de cada entrada, no namespace
 * `xmlns:image` do protocolo — não é rota separada nem arquivo a mais.
 *
 * ⚠️ **A fonte é a MESMA consulta que a página usa** (`getGalleryPhotos`), e
 * não a listagem de `public/galeria`. É a diferença que esta guarda protege:
 * um sitemap lido do disco prometeria ao Google arquivo que a página não
 * publica — `published: false` no banco tira a foto da tela e **não** a tiraria
 * de uma varredura de diretório. Prometer ao buscador imagem que a página não
 * mostra é a mesma falha de um `<title>` que promete o que a página não tem.
 *
 * ⚠️ **E cada rota declara só o que ELA mostra.** Apontar a mesma foto a partir
 * de várias páginas é o que o Google trata como ruído. As do topo são
 * exclusivas da home por decisão de 01/10/2026 (ver `heroPhotos` em
 * `config/site.ts`), então é só lá que elas aparecem.
 */
const ENV = { SITE_INDEXABLE: true, NEXT_PUBLIC_SITE_URL: "https://exemplo.test" };

const FOTOS = [
  { id: "f1", image: "/galeria/buffet-de-saladas.webp", caption: "Buffet de saladas" },
  { id: "f2", image: "/galeria/churrasco.webp", caption: "Churrasco na brasa" },
  { id: "f3", image: "/galeria/balcao-das-massas.webp", caption: "Balcão das massas" },
];

const CONTEUDO = {
  getInformationSitemapEntries: async () => [{ slug: "nota", updatedAt: new Date(0) }],
  getGalleryPhotos: async () => FOTOS,
};

async function mapa(queries: object = CONTEUDO): Promise<MetadataRoute.Sitemap> {
  vi.resetModules();
  vi.doMock("@/lib/env", () => ({ env: ENV }));
  vi.doMock("@/lib/queries", () => queries);
  const mod = (await import("@/app/sitemap")) as {
    default: () => Promise<MetadataRoute.Sitemap>;
  };
  return mod.default();
}

type Entrada = MetadataRoute.Sitemap[number] & { images?: string[] };

const daRota = (m: MetadataRoute.Sitemap, sufixo: string) =>
  m.find((e) => e.url === `${ENV.NEXT_PUBLIC_SITE_URL}${sufixo}`) as Entrada | undefined;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("as fotos entram no mapa do site", () => {
  it("a galeria declara as fotos que a página publica", async () => {
    const m = await mapa();
    const galeria = daRota(m, "/galeria");

    expect(galeria, "/galeria saiu do sitemap").toBeTruthy();
    expect(galeria!.images, "/galeria entrou sem imagem nenhuma").toHaveLength(FOTOS.length);
  });

  it("as URLs de imagem são absolutas, que é o que o protocolo exige", async () => {
    const m = await mapa();
    for (const url of daRota(m, "/galeria")!.images!) {
      expect(url, `"${url}" não é absoluta`).toMatch(/^https:\/\//);
      // E aponta para o domínio do site, não para o da Vercel nem para outro.
      expect(url.startsWith(ENV.NEXT_PUBLIC_SITE_URL)).toBe(true);
    }
  });

  it("a home declara as fotos do topo, e a galeria não as repete", async () => {
    const m = await mapa();
    const home = daRota(m, "");
    expect(home!.images, "a home entrou sem as fotos do topo").not.toHaveLength(0);
    for (const url of home!.images!) expect(url).toContain("/hero/");

    // A mesma foto apontada de duas páginas é o que o Google lê como ruído.
    const naGaleria = new Set(daRota(m, "/galeria")!.images);
    for (const url of home!.images!) {
      expect(naGaleria.has(url), `${url} aparece na home E na galeria`).toBe(false);
    }
  });

  it("rota sem foto não declara `images` vazio", async () => {
    const m = await mapa();
    // `images: []` é lixo no XML: anuncia a propriedade e não entrega nada.
    for (const sufixo of ["/contato", "/terms", "/privacy", "/reservas"]) {
      const e = daRota(m, sufixo);
      expect(e, `${sufixo} saiu do sitemap`).toBeTruthy();
      expect(e!.images, `${sufixo} declarou images vazio`).toBeUndefined();
    }
  });

  it("banco fora do ar tira a imagem, e NÃO a página", async () => {
    /*
     * A assimetria é o ponto, e segue o critério que o bloco de novidades do
     * `sitemap.ts` já usava: imagem a menos é oportunidade perdida; página a
     * menos é índice encolhido. Uma falha passageira de banco não pode
     * encolher o sitemap.
     */
    const m = await mapa({
      ...CONTEUDO,
      getGalleryPhotos: async () => {
        throw new Error("Can't reach database server");
      },
    });

    const galeria = daRota(m, "/galeria");
    expect(galeria, "/galeria sumiu do sitemap por causa das fotos").toBeTruthy();
    expect(galeria!.images).toBeUndefined();
    // E a home, que não depende do banco, segue com as dela.
    expect(daRota(m, "")!.images).not.toHaveLength(0);
  });

  it("a trava de lançamento continua valendo acima de tudo isto", async () => {
    // Sentinela: com o site fechado não há sitemap, e portanto não há imagem a
    // prometer. Sem isto, as asserções acima poderiam passar num estado em que
    // o arquivo nem deveria existir.
    vi.resetModules();
    vi.doMock("@/lib/env", () => ({
      env: { SITE_INDEXABLE: false, NEXT_PUBLIC_SITE_URL: ENV.NEXT_PUBLIC_SITE_URL },
    }));
    vi.doMock("@/lib/queries", () => CONTEUDO);
    const mod = (await import("@/app/sitemap")) as {
      default: () => Promise<MetadataRoute.Sitemap>;
    };
    expect(await mod.default()).toEqual([]);
  });
});
