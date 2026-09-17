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
 * ✅ **Chegaram em 17/09/2026.** O cliente confirmou o modelo em 31/08 (buffet
 * por quilo, massas com preço próprio) e nesta data passou os valores: **R$
 * 94,99 o quilo** e **R$ 41,90 a porção** de 190 g.
 *
 * ⚠️ **O tipo continua opcional, e isso não é resto de andaime.** Os dois
 * ajudantes (`precoDoBuffet`, `precoDaMassa`) devolvem `null` sem valor e quem
 * chama some com o aviso inteiro — em vez de mostrar "R$ 0,00" ou um rótulo
 * seguido de vazio. Essa degradação foi construída antes dos números
 * chegarem, custou o seu trabalho, e é o que segura o dia em que um preço
 * mudar e alguém apagar a linha antes de ter o novo. Mesmo contrato do telefone
 * (`contact.phone`), do WhatsApp (`whatsappLink()`) e do horário
 * (`openingHoursLabel()`). **Não torne obrigatório.**
 *
 * `test/o-cardapio-funciona-sem-o-preco.test.ts` cobra os dois lados: o valor
 * configurado E o caminho do ausente, este com argumento explícito para não
 * depender do que está aqui.
 */
export const menuPricing: {
  /** Buffet por quilo — cobrado pelo peso do prato montado. */
  buffetPerKg?: number;
  /** Massas — valor fechado por porção, independente da combinação. */
  pasta?: number;
} = {
  buffetPerKg: 94.99,
  pasta: 41.9,
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
 * A escolha é por **molhos visivelmente diferentes**: pesto verde, sugo
 * vermelho e molho branco. Três fotos do mesmo penne venderiam a ilha como se
 * ela tivesse uma opção só, e três fotos de molho vermelho fariam o mesmo.
 *
 * As três foram trocadas em 10/09 por fotografia profissional de prato, que o
 * cliente mandou. A anterior de "três pratos numa travessa" saiu: numa faixa de
 * três quadros, uma foto que já mostra três pratos compete com as vizinhas em
 * vez de somar.
 *
 * `name` alimenta o texto alternativo. Sem ele as três leriam igual para quem
 * usa leitor de tela — "foto do prato" três vezes descreve uma massa repetida.
 */
export const pastaPhotos = [
  { photo: "/massas/fettuccine-ao-pesto.webp", name: "Fettuccine ao pesto" },
  { photo: "/massas/nhoque-ao-sugo.webp", name: "Nhoque ao sugo" },
  { photo: "/massas/massa-ao-molho-branco.webp", name: "Massa ao molho branco" },
  { photo: "/massas/cappelletti-ao-sugo.webp", name: "Cappelletti ao sugo" },
  { photo: "/massas/massa-a-bolonhesa.webp", name: "Massa à bolonhesa" },
  { photo: "/massas/nhoque-ao-sugo-com-pao.webp", name: "Nhoque ao sugo com pão" },
  { photo: "/massas/fettuccine-ao-pesto-com-vinho.webp", name: "Fettuccine ao pesto com vinho" },
  { photo: "/massas/tres-massas-emplatadas.webp", name: "Três massas da ilha" },
] as const;

/**
 * Adicionais com preço próprio, cobrados por unidade.
 *
 * ✅ **Os dois valores chegaram em 17/09/2026** — filé de frango R$ 7,50 e bife
 * de alcatra R$ 8,50. Os gramas já vinham confirmados de 03/09, com a
 * composição da ilha.
 *
 * Até esta data a lista era VAZIA de propósito, e o motivo sobrevive a ela
 * estar cheia: o adicional é a exceção à regra de que o preço é da seção, então
 * uma linha "Filé de frango" sem valor no meio do cardápio lê como INCLUSA e a
 * pessoa descobre o contrário na conta. `PastaBuilder` some com a seção inteira
 * quando a lista está vazia — é assim que um adicional novo espera o preço sem
 * enganar ninguém.
 */
export const pastaExtras: readonly PastaExtra[] = [
  { name: "Filé de frango", weight: "110 gramas", price: 7.5 },
  { name: "Bife de alcatra", weight: "120 gramas", price: 8.5 },
];

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
 * **Confirmado em 04/09/2026.** Os rótulos e preços são os mesmos do projeto
 * irmão. Vieram por instrução em 03/09 e foram reafirmados depois de eu
 * levantar a evidência abaixo — não estão aqui por suposição.
 *
 * ⚠️ A evidência que levantei e que o cliente respondeu, guardada porque ela
 * volta a aparecer: a foto do salão traz uma garrafa de **Pérgola, vinho de
 * mesa tinto suave do Rio Grande do Sul, 1 litro** em primeiro plano, e há
 * outras nas mesas ao fundo. Pérgola não é Del Grano nem Block, e é de outra
 * faixa de preço. Quem abrir aquela foto vai fazer a mesma pergunta.
 *
 * A resposta é esta linha: a carta é a do projeto irmão, e o Pérgola nas mesas
 * não a contradiz — pode ser vinho de mesa servido à parte, decoração ou item
 * fora de carta. Se um dia entrar na carta, entra como rótulo novo; o formato
 * de um rótulo com várias doses já comporta isso sem mudar código.
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
