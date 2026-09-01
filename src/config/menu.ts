/**
 * ─────────────────────────────────────────────────────────────────────────
 *  CARDÁPIO DIGITAL — PREÇOS E ESTRUTURA DA SEMANA
 * ─────────────────────────────────────────────────────────────────────────
 * Fonte única dos valores e dos dias. Os pratos moram no banco e são editados
 * pelo painel (`/admin/cardapio`); aqui ficam só as constantes que o
 * restaurante muda de vez em quando e que precisam bater em todo lugar do site.
 *
 * **Por que o preço não fica no prato:** o buffet é cobrado por peso e a ilha de
 * massas tem um valor único de seção. Nenhum prato tem preço próprio, e é
 * exatamente isso que quem está na mesa precisa entender ao ler o cardápio.
 */

/**
 * Valores em reais.
 *
 * ⚠️ **PENDENTE — os dois números ainda não vieram do cliente.** Ele confirmou
 * o modelo em 31/08 (buffet por quilo, massas com preço próprio) e não passou os
 * valores.
 *
 * `undefined` de propósito, e não um número plausível: inventar preço é o mesmo
 * erro que o `AGENTS.md` proíbe em razão social e CNPJ, com uma agravante — um
 * preço errado numa mesa é uma discussão no caixa. Enquanto estiverem assim, o
 * aviso de preço não aparece, no mesmo padrão do telefone, do WhatsApp e do
 * horário deste projeto.
 *
 * Preencher é uma linha cada.
 */
export const menuPricing: {
  /** Buffet por quilo — cobrado pelo peso do prato montado. */
  buffetPerKg?: number;
  /** Massas — valor fechado por porção, independente da combinação. */
  pasta?: number;
} = {
  buffetPerKg: undefined,
  pasta: undefined,
};

/** Formata em real brasileiro: 105.9 → "R$ 105,90". */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * O preço do buffet, com o sufixo por quilo — ou `null` quando não há preço.
 *
 * Zero também devolve `null`: em JavaScript `0` é falso, e um preço de zero é
 * dado ausente, não promoção. Os dois casos precisam do mesmo caminho, senão o
 * cardápio anuncia buffet de graça.
 */
export function precoDoBuffet(
  valor: number | undefined = menuPricing.buffetPerKg,
): string | null {
  if (!valor) return null;
  return `${formatBRL(valor)}/kg`;
}

/** O preço da porção de massa, ou `null` quando não há preço. Ver acima. */
export function precoDaMassa(
  valor: number | undefined = menuPricing.pasta,
): string | null {
  if (!valor) return null;
  return formatBRL(valor);
}

/**
 * Os dias úteis, 1 (segunda) a 5 (sexta) — o restaurante não abre no fim de
 * semana, e o horário publicado diz isso. O número é o que vai para o banco
 * (`MenuItem.weekdays`); o rótulo visível vem do catálogo de traduções, nunca
 * daqui.
 *
 * ⚠️ Não há link direto por dia (`/cardapio?dia=terca`). Os ajudantes para isso
 * vieram junto quando esta configuração foi trazida do projeto irmão, e ficaram
 * sem uso: nem lá nem aqui alguma página os chamava. Saíram em 31/08 porque
 * ajudante sem consumidor é peso morto — e este projeto tem guarda contra isso.
 * Se o link direto for pedido um dia, eles voltam junto com a página que os usa.
 */
export const WEEKDAYS = [1, 2, 3, 4, 5] as const;

export type Weekday = (typeof WEEKDAYS)[number];



/**
 * Estreita um número vindo do banco, que o Prisma tipa como `number` solto.
 *
 * Nada impede um 6 de entrar por um script de importação — este é o ponto onde
 * ele para, antes de virar uma aba de sábado num restaurante que fecha.
 */
export function isWeekday(value: number): value is Weekday {
  return (WEEKDAYS as readonly number[]).includes(value);
}
