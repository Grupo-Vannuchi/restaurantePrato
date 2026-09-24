import "server-only";
import { getInformations } from "@/lib/queries";
import type { Locale } from "@/i18n/routing";

export type HeaderLinks = {
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
    /*
     * Uma consulta só. A das categorias do cardápio saiu em 31/08 junto com o
     * menu suspenso que ela alimentava: em `/cardapio` as categorias vivem
     * dentro das abas de dia, e não há âncora para onde apontar. Manter a busca
     * seria uma ida ao banco em TODA página do site para preencher uma lista
     * que ninguém lê.
     */
    /*
     * ⚠️ **`featuredOnly` desde 24/09/2026: o menu passou a listar SÓ o que
     * estiver marcado como destaque, e a razão é do cliente.**
     *
     * O menu listava as dezesseis novidades publicadas, e as dezesseis são
     * páginas de busca local ("almoço perto da Catedral de Santos"). O cliente
     * não gostou de ver o SEO exposto no cabeçalho, e tem razão: aquilo é
     * infraestrutura de busca, não recado para quem já está no site.
     *
     * Elas continuam publicadas, continuam no `sitemap.xml` e continuam
     * listadas em `/novidades` — o trabalho de SEO segue inteiro. O que muda é
     * que saem do menu, que é onde viravam ruído.
     *
     * O filtro usa `featured`, que já existia no model, no índice
     * (`@@index([published, featured, order])`) e no formulário do admin **sem
     * nenhum consumidor**: marcar uma novidade como destaque não fazia nada.
     * Agora faz, e quem decide o que aparece é o próprio cliente, pelo painel —
     * sem lista de slugs no código, que envelheceria na primeira novidade nova.
     *
     * ⚠️ Hoje nenhuma está marcada, então o menu mostra "Em breve, novidades por
     * aqui." — o mesmo estado vazio que o projeto irmão desenha. Isso é
     * correto: o Prato ainda não tem novidade de verdade, e essa é uma
     * pendência aberta do cliente. Não marcar uma página de SEO como destaque
     * só para o menu não ficar vazio; era exatamente disso que ele reclamou.
     *
     * A mesma decisão, tomada no mesmo dia, está em
     * `src/app/[locale]/(marketing)/layout.tsx` do projeto irmão.
     */
    const informations = await getInformations(locale, { featuredOnly: true });
    return {
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
    return { informationLinks: [] };
  }
}
