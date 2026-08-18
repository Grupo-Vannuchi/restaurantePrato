import { siteConfig, fullAddress } from "@/config/site";
import { defaultLocale } from "@/i18n/routing";
import { localizedUrl } from "@/lib/seo";
import { getMenu } from "@/lib/queries";

/**
 * `/llms.txt` — a concise, link-rich map of the site for LLM/AI crawlers, per
 * the llmstxt.org convention. Served as plain text and revalidated daily; the
 * content list degrades to the core pages if the database is unavailable.
 */
export const revalidate = 86400;

function line(title: string, path: string, description?: string): string {
  const url = localizedUrl(defaultLocale, path);
  return description
    ? `- [${title}](${url}): ${description}`
    : `- [${title}](${url})`;
}

export async function GET(): Promise<Response> {
  const { name } = siteConfig;

  const core = [
    line(
      "A Experiência",
      "/experiencia",
      "O salão, a história da casa e o que esperar de um almoço aqui",
    ),
    line(
      "Nossa Gastronomia",
      "/gastronomia",
      "Churrasco na brasa, peixes, ilha de massas e o buffet completo",
    ),
    line("Galeria", "/galeria", "Fotos do salão e dos pratos"),
    line(
      "Horários & Reservas",
      "/reservas",
      "Quando abrimos, o melhor horário para ir e reservas para grupos",
    ),
    line("Contato", "/contato", "Endereço, telefone e como chegar"),
  ];

  let menu: string[] = [];
  try {
    const categories = await getMenu(defaultLocale);
    menu = categories.map((c) =>
      line(c.name, `/gastronomia#${c.slug}`, c.description),
    );
  } catch {
    // Database unavailable — ship the core pages only.
  }

  const { openingHours } = siteConfig;
  const hours = openingHours
    ? ` Aberto das ${openingHours.opens.replace(":00", "h")} às ${openingHours.closes.replace(":00", "h")}.`
    : "";
  const sections = [
    `# ${name}`,
    "",
    `> Restaurante e cafeteria no Centro de Santos — ${fullAddress()}.${hours}`,
    "",
    "## Páginas principais",
    ...core,
  ];

  if (menu.length) sections.push("", "## Nossa gastronomia", ...menu);

  return new Response(`${sections.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
