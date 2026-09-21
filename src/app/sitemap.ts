import type { MetadataRoute } from "next";
import { defaultLocale } from "@/i18n/routing";
import { localizedUrl, languageAlternates } from "@/lib/seo";
import { getInformationSitemapEntries } from "@/lib/queries";
import { env } from "@/lib/env";

type Entry = { path: string; lastModified: Date };

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
  ].map((path) => ({ path, lastModified: now }));

  return [...staticEntries, ...informationEntries].map(
    ({ path, lastModified }) => ({
      url: localizedUrl(defaultLocale, path),
      lastModified,
      alternates: { languages: languageAlternates(path) },
    }),
  );
}
