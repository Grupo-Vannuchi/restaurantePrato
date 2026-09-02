/**
 * Traduz o formato bruto da Graph API para o que a interface consome.
 *
 * Separado de `lib/instagram.ts` de propósito: aquele é `server-only`, guarda o
 * token e vai à rede; este é função pura, sem I/O e sem segredo — o que permite
 * testar as regras de capa e descarte sem tocar na Meta. As armadilhas desta
 * integração vivem todas aqui.
 */

/** O que a interface consome. Cru da Graph API não passa daqui. */
export type InstagramPost = {
  id: string;
  /** Legenda; string vazia quando o post não tem. */
  caption: string;
  type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  /** Imagem a exibir: a própria, a capa do vídeo ou a primeira do álbum. */
  image: string;
  permalink: string;
  /** ISO — `unstable_cache` serializa o payload, e um Date volta string. */
  timestamp: string;
};

/** Formato bruto da Graph API, só com os campos que pedimos. */
export type RawMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  children?: { data?: { media_url?: string; thumbnail_url?: string }[] };
};

/**
 * Escolhe a imagem do card.
 *
 * `media_url` não vem sempre, e é aí que quase toda integração tropeça:
 *
 *  - **VIDEO** — `media_url` é o arquivo do vídeo. Usar isso como capa faria o
 *    navegador baixar megabytes para desenhar um quadrado; a capa é
 *    `thumbnail_url`.
 *  - **CAROUSEL_ALBUM** — o álbum não tem mídia própria, tem filhos. A Meta
 *    costuma devolver `media_url` ausente, e a capa é a primeira criança.
 *  - **IMAGE** — o caminho simples.
 */
export function coverOf(media: RawMedia): string | null {
  if (media.media_type === "VIDEO") {
    return media.thumbnail_url ?? null;
  }
  if (media.media_type === "CAROUSEL_ALBUM") {
    const first = media.children?.data?.[0];
    return first?.media_url ?? first?.thumbnail_url ?? media.media_url ?? null;
  }
  return media.media_url ?? media.thumbnail_url ?? null;
}

/**
 * Normaliza um item. Devolve `null` quando o post não dá um card possível —
 * sem imagem, sem link ou sem data. Melhor faltar um card do que desenhar um
 * quadrado quebrado na grade.
 */
export function normalizeMedia(media: RawMedia): InstagramPost | null {
  const image = coverOf(media);
  if (!image || !media.permalink || !media.timestamp) return null;

  const type =
    media.media_type === "VIDEO" || media.media_type === "CAROUSEL_ALBUM"
      ? media.media_type
      : "IMAGE";

  return {
    id: media.id,
    caption: media.caption ?? "",
    type,
    image,
    permalink: media.permalink,
    timestamp: media.timestamp,
  };
}

/**
 * Normaliza a lista inteira, descarta o que não vira card, ordena do mais novo
 * para o mais antigo e corta no limite.
 *
 * A Meta já devolve em ordem decrescente, mas ordenar aqui torna a garantia
 * nossa em vez de suposição sobre o comportamento dela.
 */
export function toPosts(list: RawMedia[], limit: number): InstagramPost[] {
  return list
    .map(normalizeMedia)
    .filter((post): post is InstagramPost => post !== null)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}
