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

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  BEBIDAS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Transcritas do quadro do salão, fotografado pelo cliente em 02/09/2026.
 *
 * **Cada bebida tem preço próprio.** É a exceção à regra de que o preço é da
 * seção: bebida não entra no valor por quilo, é cobrada à parte, e é isso que
 * quem está na mesa precisa entender ao ler.
 *
 * Os sabores não entram aqui. No quadro cada linha traz a lista em corpo miúdo
 * ("Guaraná | Coca-Cola | …"), e o que chega na geladeira muda; publicar sabor
 * por sabor vira promessa que a casa não cumpre num dia de entrega ruim.
 *
 * `volume` é o que separa duas linhas com o mesmo nome: refrigerante de 200 ml
 * e de 350 ml são itens diferentes, com preços diferentes. Perder o volume de
 * uma delas colapsa as duas numa linha só.
 *
 * ⚠️ **PENDENTE — três linhas do quadro não entraram, e nenhuma por descuido:**
 *
 * - **Schweppes Citrus** — li o preço como R$ 10,80 e o volume como 355 ml, mas
 *   é o único valor da coluna que foge dos 8,60 repetidos, então é justamente o
 *   que eu menos posso chutar. Falta confirmar.
 * - **Itubaína Retrô (355 ml)** e **Cerveja Heineken (330 ml)** — os nomes se
 *   leem, os preços ficaram fora do enquadramento da foto.
 *
 * Elas ficam de fora da lista em vez de entrar com zero ou com o valor do
 * projeto irmão: `formatBRL(0)` devolve "R$ 0,00", que é uma linha bem formatada
 * anunciando cerveja de graça. O teste
 * `test/sobremesa-e-bebida-tem-preco-proprio.test.ts` recusa preço zero por isso.
 */
export type Drink = { name: string; volume: string; price: number };

export const drinkGroups = [
  {
    /** O rótulo do grupo é interface e vem do catálogo; o nome da bebida, não. */
    labelKey: "drinksSodasBeer",
    items: [
      { name: "Refrigerante", volume: "200 ml", price: 5.6 },
      { name: "Refrigerante zero", volume: "200 ml", price: 5.6 },
      { name: "Refrigerante", volume: "350 ml", price: 8.6 },
      { name: "Refrigerante zero", volume: "350 ml", price: 8.6 },
      { name: "Chá Mate Leão", volume: "450 ml", price: 8.6 },
      { name: "H2O", volume: "500 ml", price: 8.6 },
      { name: "H2O Limoneto", volume: "500 ml", price: 8.6 },
      { name: "Sprite Lemon Fresh", volume: "350 ml", price: 8.6 },
    ],
  },
] as const satisfies readonly {
  labelKey: string;
  items: readonly Drink[];
}[];

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  SOBREMESAS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * **A lista está vazia, e isso é o estado correto hoje.** Os onze nomes se leem
 * na foto do quadro; os preços, não — a coluna de valores é uma fileira de
 * etiquetas escuras que não abrem na imagem enviada em 02/09/2026.
 *
 * Os nomes lidos, à espera dos valores:
 *
 *   Salada de frutas (220 g) · ½ porção de salada de frutas · Gelatina (120 ml,
 *   limão/morango/uva) · Gelatina zero (morango/uva) · Mousse de chocolate
 *   (meio amargo) · Creme de papaia com cassis · Petit gateau com sorvete
 *   (creme ou flocos) · Brownie com sorvete (creme ou flocos) · Pudim (pedaço) ·
 *   Torta holandesa · Torta de limão
 *
 * O quadro também traz, em corpo miúdo sob as duas saladas de frutas, uma taxa
 * de embalagem para viagem. Ela é nota da seção, dita uma vez — ao lado do preço
 * da sobremesa virariam dois "R$" na mesma linha, um deles não sendo o que a
 * sobremesa custa. O valor dessa taxa também não se lê.
 *
 * ⚠️ Enquanto vazia, a seção inteira **não é desenhada** — a página não anuncia
 * uma vitrine de sobremesas sem sobremesa nenhuma. É a mesma degradação da ilha
 * de massas e do aviso de preço: sumir é honesto, listar vazio não é.
 */
export type Dessert = {
  name: string;
  /** Porção, sabores ou o que o quadro traz em corpo miúdo sob o nome. */
  note?: string;
  price: number;
  /** Caminho da miniatura em `public`, quando a sobremesa tem foto. */
  photo?: string;
};

export const desserts: readonly Dessert[] = [];
