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
 *  ILHA DE MASSAS — COMO SE MONTA UM PRATO
 * ─────────────────────────────────────────────────────────────────────────
 *
 * O cliente confirmou em 03/09/2026 que a ilha do Prato é a mesma do projeto
 * irmão: mesmos formatos, mesmo preparo, mesmos molhos, mesma porção.
 *
 * **A sequência é a informação.** O cliente escolhe nessa ordem, de pé na frente
 * do cozinheiro — massa, preparo, molho, ingredientes. Embaralhar os passos não
 * é reordenar uma lista, é descrever outro serviço.
 *
 * **Os ingredientes não entram aqui, de propósito.** Eles mudam toda semana,
 * conforme o que chega. Uma lista publicada no site vira promessa que a cozinha
 * não consegue cumprir num dia de entrega ruim. O cardápio informa QUANTOS o
 * cliente escolhe, nunca QUAIS — que é exatamente o que o cardápio de papel faz.
 * `test/como-se-monta-um-prato-na-ilha.test.tsx` verifica isso pela estrutura:
 * três passos rendem lista, o de ingredientes rende parágrafo.
 *
 * Nenhum destes textos está escrito dentro de componente: mexer aqui muda a
 * página.
 *
 * ⚠️ **PENDENTE — os adicionais existem e estão sem preço.** O cardápio lista
 * filé de frango (110 g) e bife de alcatra (120 g), cobrados por unidade. É a
 * exceção à regra de que o preço é da seção, e por isso mesmo eles não podem
 * entrar sem valor: uma linha "Filé de frango" solta no meio do cardápio lê como
 * incluso, e o cliente descobre o contrário na conta. Ficam fora até os valores
 * chegarem — mesma decisão das sobremesas.
 *
 * ⚠️ **PENDENTE — o preço da porção.** `menuPricing.pasta` segue indefinido, e
 * enquanto estiver o título da seção sai sem valor em vez de sair com um vazio.
 */
export type PastaExtra = { name: string; weight: string; price: number };

export const pastaChoices = {
  /** Porção única — não há meia nem dobrada. */
  portion: "190 gramas",
  /** Os formatos disponíveis, na ordem do cardápio. */
  shapes: [
    "Nhoque de mandioquinha",
    "Nhoque de batata",
    "Gravata",
    "Cappelletti de carne ou frango",
    "Penne integral",
    "Espaguete",
    "Ravioli verde de quatro queijos",
    "Ravioli de queijo",
    "Talharim",
    "Penne",
  ],
  /** Base do preparo, escolhida na hora. */
  preparation: ["Azeite ou manteiga", "Cebola e alho"],
  /** Quantos ingredientes entram — nunca quais. */
  ingredientLimit: 5,
  sauces: ["Sugo", "Branco", "Bolonhesa", "4 queijos", "Funghi", "Pesto"],
} as const;

/**
 * As fotos que abrem a ilha de massas.
 *
 * São arquivos em `public/massas`, não slugs de prato cadastrado. Amarrar a
 * foto ao catálogo obrigaria a existir um prato "nhoque ao sugo" com aquele dia
 * da semana só para a imagem aparecer — e a faixa ilustra a ILHA, não a lista
 * de terça-feira.
 *
 * A escolha é por massas visivelmente diferentes entre si: pesto verde, nhoque
 * ao sugo vermelho e a travessa com três pratos. Três fotos do mesmo penne
 * venderiam a ilha como se ela tivesse uma opção só.
 *
 * `name` alimenta o texto alternativo. Sem ele as três leriam igual para quem
 * usa leitor de tela — "foto do prato" três vezes descreve uma massa repetida.
 */
export const pastaPhotos = [
  { photo: "/massas/fettuccine-ao-pesto.webp", name: "Fettuccine ao pesto" },
  { photo: "/massas/nhoque-ao-sugo.webp", name: "Nhoque ao sugo" },
  { photo: "/massas/tres-massas.webp", name: "Massas da ilha" },
] as const;

/** Adicionais com preço próprio. Vazio até os valores chegarem — veja acima. */
export const pastaExtras: readonly PastaExtra[] = [];

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
 * ⚠️ **PENDENTE — a Cerveja Heineken (330 ml) não entrou, e o motivo está no
 * próprio quadro: a linha pontilhada dela termina sem etiqueta de preço.** Não
 * é corte de foto nem falta de nitidez — o adesivo não está lá. Enquanto o
 * valor não vier, ela fica fora.
 *
 * ⚠️ **Duas leituras minhas de 02/09 estavam erradas e foram corrigidas em
 * 03/09, com a foto em alta:** o Sprite Lemon Fresh é de **510 ml** (eu havia
 * lido 350) e o Schweppes Citrus custa **8,60** — o 10,80 que eu tinha atribuído
 * a ele é da **Itubaína Retrô**. As etiquetas ficam acima da linha a que
 * pertencem, e num quadro fotografado de lado isso desloca a leitura em uma
 * posição. Conferir seguindo a linha pontilhada, não a altura.
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
      { name: "Sprite Lemon Fresh", volume: "510 ml", price: 8.6 },
      { name: "Schweppes Citrus", volume: "350 ml", price: 8.6 },
      { name: "Itubaína Retrô", volume: "355 ml", price: 10.8 },
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
 * Transcritas do quadro do salão, fotografado pelo cliente. Os nomes já se liam
 * na foto de 02/09; os preços só abriram na versão em alta, de 03/09.
 *
 * **Cada uma tem preço próprio**, como as bebidas: sobremesa não entra no valor
 * por quilo. Dizer que está inclusa quando não está é o erro que o cliente
 * descobre na conta.
 *
 * A taxa de embalagem para viagem NÃO é uma nota única de seção: o quadro traz
 * um valor para a salada de frutas (R$ 8,50) e outro para a meia porção
 * (R$ 13,00). Ela vive na observação de cada linha, sob o nome, e não ao lado do
 * preço — ali virariam dois "R$" na mesma linha, um deles não sendo o que a
 * sobremesa custa.
 *
 * ⚠️ **CONFERIR COM O CLIENTE: a meia porção custa MAIS que a inteira** — R$ 11,00
 * contra R$ 8,00, e para viagem R$ 13,00 contra R$ 8,50. Está assim no quadro, e
 * transcrevi o que está escrito. Ou "1/2 porção" é uma porção maior que os 220 g
 * (meio quilo, por exemplo), ou o quadro tem um erro. Não dá para decidir pela
 * foto, e inverter por conta própria seria inventar preço.
 *
 * Sem foto: o cliente não mandou imagem de sobremesa. O campo `photo` é opcional
 * e a linha ocupa a largura toda sem ele, em vez de reservar um quadrado vazio.
 */
export type Dessert = {
  name: string;
  /** Porção, sabores ou o que o quadro traz em corpo miúdo sob o nome. */
  note?: string;
  price: number;
  /** Caminho da miniatura em `public`, quando a sobremesa tem foto. */
  photo?: string;
};

export const desserts: readonly Dessert[] = [
  { name: "Salada de frutas", note: "220 g · para viagem R$ 8,50", price: 8.0 },
  { name: "Meia porção de salada de frutas", note: "Para viagem R$ 13,00", price: 11.0 },
  { name: "Gelatina", note: "120 ml · limão, morango ou uva", price: 3.5 },
  { name: "Gelatina zero", note: "Morango ou uva", price: 4.0 },
  { name: "Mousse de chocolate", note: "Chocolate meio amargo", price: 16.0 },
  { name: "Creme de papaia com cassis", price: 18.0 },
  { name: "Petit gateau com sorvete", note: "Sorvete de creme ou flocos", price: 20.0 },
  { name: "Brownie com sorvete", note: "Sorvete de creme ou flocos", price: 20.0 },
  { name: "Pudim", note: "Pedaço", price: 16.0 },
  { name: "Torta holandesa", price: 16.0 },
  { name: "Torta de limão", price: 16.0 },
];

/**
 * ─────────────────────────────────────────────────────────────────────────
 *  CARTA DE VINHOS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * A casa serve **duas linhas** — uma nacional e uma importada —, e cada uma sai
 * em mais de uma dose. Por isso o vinho não cabe no formato das bebidas, de um
 * nome para um preço: aqui um rótulo tem vários preços, e é a dose que os
 * separa. Taça, meia taça e garrafa são o mesmo vinho.
 *
 * ⚠️ **CONFIRMAR COM O CLIENTE — estes rótulos e preços vieram do projeto
 * irmão, por instrução direta em 03/09 ("as mesmas opções de vinho").** Não
 * foram lidos de nenhuma carta do Prato, porque nenhuma foi fotografada.
 *
 * Há uma evidência específica contra: a foto do quadro do salão, enviada em
 * 02/09, traz uma garrafa de **Pérgola, vinho de mesa tinto suave do Rio Grande
 * do Sul, 1 litro** em primeiro plano. Pérgola não é Del Grano nem Block, e é
 * um vinho de outra faixa. Uma carta que não inclui o vinho que está na mesa
 * provavelmente não é a carta daquela casa.
 *
 * Isso não bloqueia a estrutura, que é o que foi pedido e está correta de todo
 * jeito. Bloqueia a publicação com confiança: preço de garrafa errado o cliente
 * descobre na conta. Ao confirmar, apagar este aviso; ao desmentir, trocar os
 * dados e manter a estrutura.
 */
export type WineServing = {
  /** A dose, como se lê na carta: "Taça", "½ Taça", "Garrafa". */
  label: string;
  /** Volume da dose, quando a carta traz. Fica sob o nome, como nas bebidas. */
  volume?: string;
  price: number;
};

export type Wine = {
  name: string;
  /** Nacional ou importado — o que a carta destaca. */
  note?: string;
  /** Os rótulos servidos sob esta linha, quando são mais de um. */
  labels?: readonly string[];
  servings: readonly WineServing[];
};

export const wines: readonly Wine[] = [
  {
    name: "Del Grano",
    note: "Nacional",
    servings: [
      { label: "Taça", volume: "175 ml", price: 17.5 },
      { label: "½ Taça", volume: "87,5 ml", price: 14.0 },
      { label: "Garrafa", price: 60.0 },
    ],
  },
  {
    name: "Block",
    note: "Importado",
    labels: [
      "Segredo do Abade",
      "Carménère",
      "Cabernet Sauvignon",
      "Sauvignon Blanc 3 Medalhas",
    ],
    servings: [
      { label: "Taça", volume: "175 ml", price: 19.5 },
      { label: "½ Taça", volume: "87,5 ml", price: 16.0 },
      { label: "Garrafa", price: 75.0 },
    ],
  },
];
