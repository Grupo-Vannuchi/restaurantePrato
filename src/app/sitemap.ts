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

  // Static marketing routes share the deploy time as their last-modified date.
  const now = new Date();
  const staticEntries: Entry[] = [
    "",
    "/experiencia",
    "/gastronomia",
    "/novidades",
    "/galeria",
    "/reservas",
    "/contato",
    "/terms",
    "/privacy",
  ].map((path) => ({ path, lastModified: now }));

  let informationEntries: Entry[] = [];
  try {
    const informations = await getInformationSitemapEntries();
    // Detail pages carry the real edit date of their content record.
    informationEntries = informations.map((i) => ({
      path: `/novidades/${i.slug}`,
      lastModified: i.updatedAt,
    }));
  } catch {
    // Database unavailable at build time — ship the static routes only.
  }

  return [...staticEntries, ...informationEntries].map(
    ({ path, lastModified }) => ({
      url: localizedUrl(defaultLocale, path),
      lastModified,
      alternates: { languages: languageAlternates(path) },
    }),
  );
}
