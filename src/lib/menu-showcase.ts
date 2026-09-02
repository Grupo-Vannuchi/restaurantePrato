/**
 * Quantos pratos a vitrine da home mostra.
 *
 * Nove, e não oito, porque a grade tem três colunas: oito deixavam a última
 * linha pela metade, com um vão à direita que lê como card faltando. Trocar
 * este número muda a seção inteira — nada mais depende dele.
 */
export const VAGAS_DA_VITRINE = 9;

/**
 * Escolhe os pratos da vitrine: um de cada categoria por vez, em rodadas.
 *
 * ⚠️ A vitrine concatenava as categorias e cortava os primeiros
 * (`flatMap(...).slice(0, 8)`). Com uma categoria de oito pratos ou mais, os
 * oito saíam TODOS dela — oito carnes na brasa e nenhuma sobremesa. A seção
 * promete mostrar o que espera por quem vem, e mostrava um canto só da cozinha.
 *
 * Em rodadas as vagas se distribuem sozinhas, e continuam se distribuindo
 * quando o restaurante mexer no cardápio. Isso importa mais do que parece: o
 * banco está vazio hoje, e quem vai preenchê-lo é o cliente pelo painel, sem
 * saber que existe uma regra de vitrine.
 *
 * Quando uma categoria acaba antes das outras — sobremesas costumam ser poucas
 * —, as vagas restantes vão para quem ainda tem prato, em vez de a vitrine
 * ficar com buracos.
 *
 * Função pura, e fora do componente, porque o componente é assíncrono de
 * servidor e depende do banco: aqui a regra é exercitável com as listas que
 * interessam, inclusive as que o banco de hoje nunca produziria.
 */
export function pratosDaVitrine<T>(
  categorias: { items: T[] }[],
  vagas: number = VAGAS_DA_VITRINE,
): T[] {
  const escolhidos: T[] = [];

  for (let rodada = 0; escolhidos.length < vagas; rodada += 1) {
    const daRodada = categorias
      .map((c) => c.items[rodada])
      .filter((item): item is T => item !== undefined);

    // Sem esta saída, um cardápio vazio giraria para sempre.
    if (daRodada.length === 0) break;

    escolhidos.push(...daRodada.slice(0, vagas - escolhidos.length));
  }

  return escolhidos;
}
