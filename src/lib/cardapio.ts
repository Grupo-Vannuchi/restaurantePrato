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
  pratos: T[],
): { categoria: { slug: string; name: string }; pratos: T[] }[] {
  const grupos = new Map<string, { categoria: T["category"]; pratos: T[] }>();

  for (const prato of pratos) {
    const existente = grupos.get(prato.category.slug);
    if (existente) existente.pratos.push(prato);
    else grupos.set(prato.category.slug, { categoria: prato.category, pratos: [prato] });
  }

  return [...grupos.values()];
}
