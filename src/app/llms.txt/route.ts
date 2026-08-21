import { openingHoursLabel, siteConfig, fullAddress } from "@/config/site";
import { defaultLocale } from "@/i18n/routing";
import { localizedUrl } from "@/lib/seo";
import { getMenu } from "@/lib/queries";
import { env } from "@/lib/env";

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

/**
 * Enquanto o site estiver fechado aos buscadores (`SITE_INDEXABLE=false`, o
 * estado normal até o domínio chegar), esta rota não existe. Serví-la seria a
 * contradição que o `robots.ts` já descreve: pedir para não ser rastreado e
 * deixar o mapa do site à mão, num caminho que é convenção pública e que
 * ninguém precisa que seja anunciado.
 */
export async function GET(): Promise<Response> {
  if (!env.SITE_INDEXABLE) return new Response("Not Found", { status: 404 });

  const { name } = siteConfig;

  const core = [
    line("A Experiência", "/experiencia", "A casa e o que esperar de uma visita"),
    line("Nossa Gastronomia", "/gastronomia", "O cardápio da casa"),
    line("Galeria", "/galeria", "Fotos do ambiente e dos pratos"),
    line("Horários", "/reservas", "Horário de funcionamento e informações práticas"),
    line("Contato", "/contato", "Endereço e como chegar"),
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

  // `openingHoursLabel` já inclui os dias — ver o aviso na função. Formatar
  // aqui a partir de `opens`/`closes` publicaria "aberto das 11h às 15h" sem
  // dizer que a casa fecha no fim de semana.
  const label = openingHoursLabel();
  const hours = label ? ` ${label}.` : "";
  const sections = [
    `# ${name}`,
    "",
    `> Buffet completo e churrasco na brasa no Centro de Santos — ${fullAddress()}.${hours}`,
    "",
    "## Páginas principais",
    ...core,
  ];

  if (menu.length) sections.push("", "## Nossa gastronomia", ...menu);

  return new Response(`${sections.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
