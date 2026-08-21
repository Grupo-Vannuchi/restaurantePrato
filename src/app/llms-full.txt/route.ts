import { siteConfig, fullAddress } from "@/config/site";
import { defaultLocale } from "@/i18n/routing";
import { localizedUrl } from "@/lib/seo";
import {
  getMenu,
  getInformations,
  getInformationBySlug,
} from "@/lib/queries";
import type { MenuCategoryView } from "@/lib/queries";
import { env } from "@/lib/env";

/**
 * `/llms-full.txt` — the expanded companion to `/llms.txt`: the FULL text of the
 * menu and articles inline, so LLMs can cite the content without fetching each
 * page (llmstxt.org convention). The gallery has no long-form content of its
 * own — see `/galeria` directly. Plain text, revalidated daily; degrades
 * gracefully if the database is unavailable.
 */
export const revalidate = 86400;

/** One content block: heading + URL + optional summary + full body. */
function block(
  title: string,
  path: string,
  summary: string,
  content: string[],
): string {
  const parts = [`## ${title}`, localizedUrl(defaultLocale, path)];
  if (summary) parts.push("", summary);
  if (content.length) parts.push("", content.join("\n"));
  return parts.join("\n");
}

/**
 * One menu category as a block: heading + anchor URL + description, with its
 * dishes listed inline (name + description) — dishes have no long-form body
 * text of their own, unlike services/projects/articles.
 */
function menuCategoryBlock(category: MenuCategoryView): string {
  const dishes = category.items.map((item) =>
    item.description ? `- ${item.name}: ${item.description}` : `- ${item.name}`,
  );
  return block(
    category.name,
    `/gastronomia#${category.slug}`,
    category.description,
    dishes,
  );
}

/**
 * Resolve each item's full detail and render it — ONE item at a time per
 * category (the three categories run in parallel, so peak DB concurrency is ~3).
 * This deliberately avoids firing every detail query at once, which would
 * exhaust the connection pool during the build prerender. A single item that
 * fails to load is skipped, not fatal.
 */
async function collect<T extends { slug: string }, D>(
  items: T[],
  fetchDetail: (slug: string) => Promise<D | null>,
  toLine: (detail: D) => string,
): Promise<string[]> {
  const out: string[] = [];
  for (const item of items) {
    try {
      const detail = await fetchDetail(item.slug);
      if (detail) out.push(toLine(detail));
    } catch {
      // Skip an item that fails to load; keep the rest.
    }
  }
  return out;
}

/**
 * Enquanto o site estiver fechado aos buscadores (`SITE_INDEXABLE=false`), esta
 * rota não existe — ver a mesma nota em `/llms.txt`. Aqui o vazamento seria
 * maior: este arquivo publica o texto integral da gastronomia e das novidades.
 */
export async function GET(): Promise<Response> {
  if (!env.SITE_INDEXABLE) return new Response("Not Found", { status: 404 });

  const { name } = siteConfig;

  const sections: string[] = [
    `# ${name} — conteúdo completo`,
    "",
    `> Buffet completo e churrasco na brasa no Centro de Santos — ${fullAddress()}.`,
    "",
    "Versão expandida de /llms.txt: o texto completo da gastronomia e das novidades, para citação por LLMs.",
  ];

  let menu: string[] = [];
  let inf: string[] = [];
  try {
    const [categories, informations] = await Promise.all([
      getMenu(defaultLocale),
      getInformations(defaultLocale),
    ]);

    menu = categories.map(menuCategoryBlock);

    inf = await collect(
      informations,
      (slug) => getInformationBySlug(defaultLocale, slug),
      (i) =>
        block(i.title, `/novidades/${i.slug}`, i.description, i.content),
    );
  } catch {
    // Lists unavailable — ship the header only.
  }

  if (menu.length) sections.push("", "# Gastronomia", "", menu.join("\n\n"));
  if (inf.length) sections.push("", "# Artigos", "", inf.join("\n\n"));

  return new Response(`${sections.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
