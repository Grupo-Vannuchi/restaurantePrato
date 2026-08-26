import "server-only";
import { getInformations, getMenuCategoryLinks } from "@/lib/queries";
import type { Locale } from "@/i18n/routing";

export type HeaderLinks = {
  categoryLinks: { slug: string; title: string }[];
  informationLinks: { slug: string; title: string; icon: string }[];
};

/**
 * Links que o cabeçalho busca no banco — e o que acontece quando ele não vem.
 *
 * ⚠️ **O site público não pode cair inteiro porque o banco não respondeu.** O
 * layout de marketing fazia estas duas buscas sem tratamento de falha: banco
 * fora do ar → a busca lança → **todas as páginas respondem erro 500**.
 *
 * O desproporcional é o ponto. Endereço, horário e reservas por WhatsApp não
 * vêm do banco — estão no código. O banco fornece só os links de cardápio e de
 * novidades do menu suspenso. Uma parte opcional derrubava o todo, e quem só
 * queria saber onde fica o restaurante recebia página de erro.
 *
 * `sitemap.xml` e `llms.txt` já se protegiam disso desde sempre; o layout, não.
 *
 * ⚠️ Degradar não é fingir que deu certo: a falha é registrada no servidor.
 * Sem isso, um banco intermitente sumiria com o menu por dias sem ninguém
 * notar — que é exatamente o modo de falhar que este projeto combate.
 */
export async function getHeaderLinks(locale: Locale): Promise<HeaderLinks> {
  try {
    const [categories, informations] = await Promise.all([
      getMenuCategoryLinks(locale),
      getInformations(locale),
    ]);
    return {
      categoryLinks: categories.map((c) => ({ slug: c.slug, title: c.name })),
      informationLinks: informations.map((i) => ({
        slug: i.slug,
        title: i.title,
        icon: i.icon,
      })),
    };
  } catch (erro) {
    console.error(
      "Menu do cabeçalho: banco indisponível, seguindo sem os links dele.",
      erro instanceof Error ? erro.message : erro,
    );
    return { categoryLinks: [], informationLinks: [] };
  }
}
