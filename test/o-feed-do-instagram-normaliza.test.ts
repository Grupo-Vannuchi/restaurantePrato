import { describe, expect, it } from "vitest";

import { coverOf, normalizeMedia, toPosts } from "@/lib/instagram-media";

/**
 * As armadilhas da integração com o Instagram vivem todas na normalização.
 *
 * A Graph API não devolve o mesmo formato para os três tipos de publicação, e é
 * exatamente aí que quase toda integração tropeça:
 *
 * - **Vídeo**: `media_url` é o ARQUIVO DE VÍDEO. Usar isso como capa faz o
 *   navegador baixar megabytes para desenhar um quadrado de 300 pixels. A capa
 *   é `thumbnail_url`.
 * - **Álbum**: não tem mídia própria, tem filhos. A Meta costuma devolver
 *   `media_url` ausente, e a capa é a primeira criança.
 * - **Imagem**: o caminho simples, e o único que um teste ingênuo cobriria.
 *
 * Estas funções são puras e ficam separadas de `lib/instagram.ts`, que é
 * `server-only`, guarda o token e vai à rede. A separação é o que permite
 * exercitar as regras sem tocar na Meta — e sem elas, a única forma de
 * descobrir o defeito do vídeo seria pelo consumo de banda de quem visitasse.
 */
const base = {
  id: "1",
  permalink: "https://instagram.com/p/abc",
  timestamp: "2026-08-31T12:00:00+0000",
};

describe("a escolha da capa", () => {
  it("do vídeo usa a miniatura, e nunca o arquivo de vídeo", () => {
    expect(
      coverOf({
        ...base,
        media_type: "VIDEO",
        media_url: "https://cdn/video.mp4",
        thumbnail_url: "https://cdn/capa.jpg",
      }),
    ).toBe("https://cdn/capa.jpg");
  });

  it("do vídeo sem miniatura é nula, em vez de cair no arquivo de vídeo", () => {
    // O caminho tentador seria `?? media_url`. Ele desenharia o card e faria o
    // visitante baixar o vídeo inteiro para ver um quadrado.
    expect(
      coverOf({ ...base, media_type: "VIDEO", media_url: "https://cdn/video.mp4" }),
    ).toBeNull();
  });

  it("do álbum é a primeira criança, porque o álbum não tem mídia própria", () => {
    expect(
      coverOf({
        ...base,
        media_type: "CAROUSEL_ALBUM",
        children: { data: [{ media_url: "https://cdn/1.jpg" }, { media_url: "https://cdn/2.jpg" }] },
      }),
    ).toBe("https://cdn/1.jpg");
  });

  it("da imagem é a própria imagem", () => {
    expect(
      coverOf({ ...base, media_type: "IMAGE", media_url: "https://cdn/foto.jpg" }),
    ).toBe("https://cdn/foto.jpg");
  });
});

describe("o descarte do que não vira card", () => {
  it("sem imagem, o post sai fora", () => {
    // Melhor faltar um card do que desenhar um quadrado quebrado na grade.
    expect(normalizeMedia({ ...base, media_type: "IMAGE" })).toBeNull();
  });

  it("sem link, o post sai fora", () => {
    expect(
      normalizeMedia({
        id: base.id,
        timestamp: base.timestamp,
        media_type: "IMAGE",
        media_url: "https://cdn/f.jpg",
      }),
    ).toBeNull();
  });

  it("sem data, o post sai fora", () => {
    expect(
      normalizeMedia({
        id: base.id,
        permalink: base.permalink,
        media_type: "IMAGE",
        media_url: "https://cdn/f.jpg",
      }),
    ).toBeNull();
  });

  it("sem legenda, o post entra com legenda vazia", () => {
    // Sentinela: legenda é opcional, imagem não. Confundir os dois esvaziaria
    // o feed de uma conta que não escreve legenda.
    const post = normalizeMedia({
      ...base,
      media_type: "IMAGE",
      media_url: "https://cdn/f.jpg",
    });
    expect(post).not.toBeNull();
    expect(post!.caption).toBe("");
  });
});

describe("a montagem da lista", () => {
  const post = (id: string, quando: string) => ({
    id,
    permalink: `https://instagram.com/p/${id}`,
    timestamp: quando,
    media_type: "IMAGE",
    media_url: `https://cdn/${id}.jpg`,
  });

  it("ordena do mais novo para o mais antigo", () => {
    // A Meta já devolve assim, mas ordenar aqui torna a garantia nossa em vez
    // de suposição sobre o comportamento dela.
    const lista = toPosts(
      [
        post("velho", "2026-01-01T10:00:00+0000"),
        post("novo", "2026-08-31T10:00:00+0000"),
        post("meio", "2026-05-01T10:00:00+0000"),
      ],
      10,
    );
    expect(lista.map((p) => p.id)).toEqual(["novo", "meio", "velho"]);
  });

  it("corta no limite pedido", () => {
    const lista = toPosts(
      Array.from({ length: 9 }, (_, i) => post(`p${i}`, `2026-0${i + 1}-01T10:00:00+0000`)),
      4,
    );
    expect(lista).toHaveLength(4);
  });

  it("conta o limite DEPOIS de descartar, e não antes", () => {
    // Por isso a consulta pede mais posts que o necessário: se o corte viesse
    // antes do descarte, quatro vídeos sem miniatura deixariam a grade vazia.
    const semCapa = { ...base, id: "ruim", media_type: "VIDEO", media_url: "https://cdn/v.mp4" };
    const lista = toPosts(
      [semCapa, semCapa, post("bom1", "2026-08-01T10:00:00+0000"), post("bom2", "2026-08-02T10:00:00+0000")],
      2,
    );
    expect(lista.map((p) => p.id)).toEqual(["bom2", "bom1"]);
  });

  it("uma lista vazia não quebra", () => {
    expect(toPosts([], 4)).toEqual([]);
  });
});
