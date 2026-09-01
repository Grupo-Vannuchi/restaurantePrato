import "server-only";
import { prisma } from "@/lib/prisma";
import { localize } from "@/lib/content";
import { locales, defaultLocale, type Locale } from "@/i18n/routing";

/**
 * Turns a captured landing path (e.g. `/novidades/nosso-novo-cardapio`) into a
 * human label ("Novidades / Nosso novo cardápio"), resolving content titles from
 * the DB. Called once when a lead is created and the result is FROZEN on the
 * lead — so renaming/deleting content later never rewrites historical
 * attribution. Best-effort: falls back to the section + slug, then the path.
 */

const SECTION_LABELS: Record<Locale, Record<string, string>> = {
  pt: {
    "": "Início",
    experiencia: "A Experiência",
    cardapio: "Cardápio",
    galeria: "Galeria",
    reservas: "Horários & Reservas",
    novidades: "Novidades",
    contato: "Contato",
    privacy: "Privacidade",
    terms: "Termos",
  },
};

async function contentTitle(
  section: string,
  slug: string,
  locale: Locale,
): Promise<string | null> {
  let row: { title: unknown } | null = null;
  if (section === "novidades") {
    row = await prisma.information.findFirst({ where: { slug }, select: { title: true } });
  }
  return row ? localize(row.title, locale) : null;
}

export async function resolveLandingLabel(
  path: string,
  locale: string,
): Promise<string> {
  const loc: Locale = (locales as readonly string[]).includes(locale)
    ? (locale as Locale)
    : defaultLocale;
  try {
    const seg = path
      .split("?")[0]
      .split("/")
      .filter(Boolean); // ["novidades","nosso-novo-cardapio"] (or ["pt", …])
    if (seg[0] && (locales as readonly string[]).includes(seg[0])) seg.shift();
    const section = seg[0] ?? "";
    const slug = seg[1];
    const sectionLabel =
      SECTION_LABELS[loc][section] ?? (section || SECTION_LABELS[loc][""]);
    if (!slug) return sectionLabel;
    if (section === "novidades") {
      const title = await contentTitle(section, slug, loc);
      if (title) return `${sectionLabel} / ${title}`;
    }
    return `${sectionLabel} / ${slug}`;
  } catch {
    return path;
  }
}
