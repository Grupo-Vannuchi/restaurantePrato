/**
 * As regras de montagem do cardápio digital, em funções puras.
 *
 * Fora dos componentes de propósito: eles são assíncronos de servidor e
 * dependem do banco, que está vazio. Aqui as regras são exercitáveis com as
 * listas que interessam, incluindo as que o banco de hoje nunca produziria.
 */

/** O mínimo que estas funções precisam saber de um prato. */
type PratoDoCardapio = {
  weekdays: number[];
  category: { slug: string; name: string };
};

/**
 * Os pratos que saem num dia da semana.
 *
 * ⚠️ **Lista de dias vazia quer dizer TODOS os dias.** O arroz, o feijão e a
 * salada não são cadastrados cinco vezes; são cadastrados uma vez, sem dia
 * marcado, e aparecem em todas as abas. Sem essa regra o dono do restaurante
 * precisaria repetir o arroz cinco vezes e corrigir os cinco toda vez que
 * mudasse a descrição.
 *
 * A inversão é fácil de escrever: `weekdays.includes(dia)` sozinho esconde todo
 * prato permanente, e a aba de segunda sai com o assado do dia e mais nada.
 *
 * A ordem de chegada é preservada — ela vem do `order` do painel, e reordenar
 * aqui tiraria do restaurante o controle sobre o que aparece primeiro.
 */
export function pratosDoDia<T extends PratoDoCardapio>(pratos: T[], dia: number): T[] {
  return pratos.filter((p) => p.weekdays.length === 0 || p.weekdays.includes(dia));
}

/**
 * Agrupa os pratos por categoria, mantendo a ordem em que cada categoria
 * apareceu pela primeira vez na lista.
 *
 * Um cardápio de mesa é lido de cima a baixo, e ler "arroz, assado, farofa"
 * misturados obriga quem lê a fazer o agrupamento de cabeça. A ordem das
 * categorias segue a dos pratos, que vem do painel.
 */
export function agrupadosPorCategoria<T extends PratoDoCardapio>(
  // `readonly` porque a funcao so LE: sem isso, uma lista congelada (como as do
  // cardapio da casa, que sao `as const`) precisaria de copia ou de cast.
  pratos: readonly T[],
): { categoria: { slug: string; name: string }; pratos: T[] }[] {
  const grupos = new Map<string, { categoria: T["category"]; pratos: T[] }>();

  for (const prato of pratos) {
    const existente = grupos.get(prato.category.slug);
    if (existente) existente.pratos.push(prato);
    else grupos.set(prato.category.slug, { categoria: prato.category, pratos: [prato] });
  }

  return [...grupos.values()];
}

/* ────────────────────────────────────────────────────────────────────────────
 *  O cardápio como dado estruturado
 * ──────────────────────────────────────────────────────────────────────────── */

/** Uma dose, porção ou tamanho com preço próprio. */
export type OfertaEstruturada = {
  /** "Taça", "½ Taça", "Garrafa" — ausente quando o item tem preço único. */
  name?: string;
  price: number;
};

/** O mínimo que o schema.org `MenuItem` precisa. */
export type ItemEstruturado = {
  name: string;
  description?: string;
  /** Ausente quando não há preço publicado. Nunca um preço inventado. */
  offers?: readonly OfertaEstruturada[];
};

/** Um `MenuSection`: um nome e os itens sob ele. */
export type SecaoEstruturada = {
  name: string;
  items: readonly ItemEstruturado[];
};

/** O que este construtor precisa de um prato vindo do banco. */
type PratoComNome = PratoDoCardapio & { name: string; description?: string };

/**
 * Monta as seções do cardápio para o dado estruturado.
 *
 * ⚠️ **SEM eixo de dia, e essa é a decisão que rege a função inteira.** O banco
 * guarda a UNIÃO das duas semanas de buffet, então um `Menu` com `hasMenuSection`
 * por dia útil afirmaria que numa segunda-feira saem ~37 pratos. Em tela isso é
 * aceitável — a pessoa vê a lista do dia e entende que é a de hoje. Em dado
 * estruturado é uma afirmação, lida por máquina, sobre o que a casa serve
 * naquele dia. Sem âncora de semana no banco, não há como emitir o dia certo.
 *
 * Então o `Menu` descreve **o que a casa serve**, não **o que sai hoje** — que é
 * verdade, é útil para a busca e não depende de dado que não temos. As três
 * opções estão registradas em `docs/seo/PLANO-DE-ACAO-PRATO.md`; esta é a (a).
 *
 * ⚠️ **Prato de buffet não leva preço, e nunca vai levar.** O buffet é cobrado
 * por peso: `MenuItem` não tem coluna de preço no schema deste projeto, e
 * inventar um valor por prato seria afirmar ao Google um preço que a casa não
 * cobra. O valor por quilo vive no `priceRange` do `Restaurant`, que é onde ele
 * é verdadeiro. Sobremesa, bebida e vinho TÊM preço por item, e é por isso que
 * só eles saem com `offers`.
 *
 * ⚠️ **Item sem preço sai sem `offers`, não com zero.** Mesmo contrato de
 * `precoDoBuffet()` e do `priceRange`: sem valor configurado, o campo não
 * aparece. A Heineken do quadro é exatamente esse caso — está no cardápio da
 * casa e não tem etiqueta.
 *
 * A ordem das seções segue a da página, porque um cardápio é lido de cima a
 * baixo e o dado estruturado não deveria contar outra história.
 */
export function secoesDoCardapio(entrada: {
  /** Pratos de buffet — a união, agrupada por categoria aqui dentro. */
  buffet: readonly PratoComNome[];
  /** Massas cadastradas no painel, se houver. */
  massas: readonly PratoComNome[];
  /** Rótulos já traduzidos: a função não conhece o catálogo de propósito. */
  rotulos: {
    massas: string;
    sobremesas: string;
    bebidas: string;
    vinhos: string;
  };
  sobremesas: readonly { name: string; note?: string; price?: number }[];
  /** Bebidas em grupos, com o rótulo do grupo já resolvido. */
  bebidas: readonly {
    name: string;
    items: readonly { name: string; volume?: string; price?: number }[];
  }[];
  vinhos: readonly {
    name: string;
    note?: string;
    servings: readonly { label: string; volume?: string; price?: number }[];
  }[];
}): SecaoEstruturada[] {
  const secoes: SecaoEstruturada[] = [];

  /** Uma oferta só existe com preço. `undefined` some do JSON-LD. */
  const oferta = (price?: number, name?: string) =>
    typeof price === "number" ? [{ ...(name && { name }), price }] : undefined;

  // Buffet: uma seção por categoria, na ordem em que a categoria aparece.
  for (const grupo of agrupadosPorCategoria(entrada.buffet)) {
    secoes.push({
      name: grupo.categoria.name,
      items: grupo.pratos.map((p) => ({
        name: p.name,
        ...(p.description && { description: p.description }),
      })),
    });
  }

  if (entrada.massas.length > 0) {
    secoes.push({
      name: entrada.rotulos.massas,
      items: entrada.massas.map((p) => ({
        name: p.name,
        ...(p.description && { description: p.description }),
      })),
    });
  }

  if (entrada.sobremesas.length > 0) {
    secoes.push({
      name: entrada.rotulos.sobremesas,
      items: entrada.sobremesas.map((s) => ({
        name: s.name,
        ...(s.note && { description: s.note }),
        ...(oferta(s.price) && { offers: oferta(s.price) }),
      })),
    });
  }

  for (const grupo of entrada.bebidas) {
    if (grupo.items.length === 0) continue;
    secoes.push({
      name: grupo.name,
      items: grupo.items.map((b) => ({
        name: b.name,
        ...(b.volume && { description: b.volume }),
        ...(oferta(b.price) && { offers: oferta(b.price) }),
      })),
    });
  }

  if (entrada.vinhos.length > 0) {
    secoes.push({
      name: entrada.rotulos.vinhos,
      items: entrada.vinhos.map((v) => {
        // Um vinho é UM item com várias doses, não vários itens: emitir
        // "Del Grano Taça" e "Del Grano Garrafa" como pratos diferentes
        // afirmaria que a casa tem dois vinhos com nomes que ninguém usa.
        const offers = v.servings
          .filter((d) => typeof d.price === "number")
          .map((d) => ({ name: d.label, price: d.price as number }));
        return {
          name: v.name,
          ...(v.note && { description: v.note }),
          ...(offers.length > 0 && { offers }),
        };
      }),
    });
  }

  return secoes;
}
