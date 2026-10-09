import type { MetadataRoute } from "next";
import { defaultLocale } from "@/i18n/routing";
import { localizedUrl, languageAlternates } from "@/lib/seo";
import { getInformationSitemapEntries, getGalleryPhotos } from "@/lib/queries";
import { heroPhotos } from "@/config/site";
import { absoluteUrl } from "@/lib/seo";
import { env } from "@/lib/env";

type Entry = { path: string; lastModified: Date; images?: string[] };

/**
 * ⚠️ O sitemap obedece à trava de lançamento. Tirar a linha `Sitemap:` do
 * `robots.txt` — como o `robots.ts` faz — não fecha porta nenhuma enquanto o
 * arquivo continuar de pé em `/sitemap.xml`: rastreador busca esse caminho por
 * convenção, sem precisar que apontem para ele.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!env.SITE_INDEXABLE) return [];

  const now = new Date();

  /*
   * As novidades vem PRIMEIRO porque decidem se a propria listagem entra.
   *
   * ⚠️ `bancoRespondeu` separa "o banco disse zero" de "o banco nao respondeu",
   * e a diferenca e o que impede uma falha passageira de encolher o sitemap:
   * sem artigo publicado, `/novidades` fica de fora; com o banco fora do ar, ela
   * fica dentro, como sempre esteve.
   */
  let informationEntries: Entry[] = [];
  let bancoRespondeu = false;
  try {
    const informations = await getInformationSitemapEntries();
    bancoRespondeu = true;
    // Detail pages carry the real edit date of their content record.
    informationEntries = informations.map((i) => ({
      path: `/novidades/${i.slug}`,
      lastModified: i.updatedAt,
    }));
  } catch {
    // Database unavailable at build time — ship the static routes only.
  }

  /*
   * ⚠️ **As fotos da galeria entram no sitemap como sitemap de IMAGEM**, pela
   * propriedade `images` que o Next 16 emite no namespace
   * `xmlns:image` — nao e rota separada nem arquivo a mais.
   *
   * Por que vale aqui: sao 29 fotos AUTORAIS do buffet, da brasa e das massas,
   * cada uma com `figcaption` proprio. Busca de imagem e intencao de almoco, e
   * sem isto o rastreador so acha essas fotos se decidir rastrear a pagina
   * inteira e interpretar a grade.
   *
   * ⚠️ **A fonte e a MESMA consulta que a pagina usa** (`getGalleryPhotos`), e
   * nao a listagem de `public/galeria`. Um sitemap lido do disco prometeria ao
   * Google arquivo que a pagina nao publica — `published: false` no banco tira
   * a foto da tela e nao tiraria dali.
   *
   * Falha de banco cai no mesmo criterio do bloco abaixo: sem foto, a entrada
   * de `/galeria` sai sem `images` em vez de sair do sitemap. Imagem a menos e
   * oportunidade perdida; pagina a menos e indice encolhido.
   */
  let fotosDaGaleria: string[] = [];
  try {
    const fotos = await getGalleryPhotos(defaultLocale);
    fotosDaGaleria = fotos.map((f) => absoluteUrl(f.image));
  } catch {
    // Banco fora do ar no build — `/galeria` entra sem imagem, como antes.
  }

  /*
   * ⚠️ **`/novidades` so entra quando tem o que mostrar** — decidido em
   * 18/09/2026, depois da reauditoria de SEO medir 89 palavras na pagina: um
   * `h1` "Novidades" e nada abaixo.
   *
   * A pagina NAO sai do site nem do menu; continua acessivel a quem clicar. O
   * que muda e deixar de OFERECE-LA ao rastreador vazia, porque pagina fina
   * oferecida no sitemap pesa contra a avaliacao do site inteiro — e some do
   * indice de qualquer jeito.
   *
   * Volta sozinha no primeiro artigo publicado. Nao ha nada a lembrar de
   * desfazer depois, que e a parte que costuma nao acontecer.
   */
  const listagemDeNovidades = !bancoRespondeu || informationEntries.length > 0;

  // Static marketing routes share the deploy time as their last-modified date.
  /*
   * ⚠️ Cada rota declara as imagens QUE ELA MOSTRA, e nao um saco de todas as
   * fotos do site: o sitemap de imagem diz ao Google em que pagina a foto
   * aparece, e apontar a mesma foto de varias paginas e o que ele trata como
   * ruido. As do topo sao exclusivas da home por decisao de 01/10 — ver
   * `heroPhotos` em `config/site.ts`.
   */
  const imagensDaRota: Record<string, string[]> = {
    "": heroPhotos.map((f) => absoluteUrl(f)),
    "/galeria": fotosDaGaleria,
  };

  const staticEntries: Entry[] = [
    "",
    "/experiencia",
    "/cardapio",
    ...(listagemDeNovidades ? ["/novidades"] : []),
    "/galeria",
    "/reservas",
    "/contato",
    "/terms",
    "/privacy",
  ].map((path) => ({
    path,
    lastModified: now,
    ...(imagensDaRota[path]?.length ? { images: imagensDaRota[path] } : {}),
  }));

  return [...staticEntries, ...informationEntries].map(
    ({ path, lastModified, images }) => ({
      url: localizedUrl(defaultLocale, path),
      lastModified,
      alternates: { languages: languageAlternates(path) },
      ...(images?.length ? { images } : {}),
    }),
  );
}
