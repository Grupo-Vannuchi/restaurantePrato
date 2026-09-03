import { PrismaClient } from "@prisma/client";

/**
 * Semeia e limpa o cardápio que `e2e/cardapio-com-conteudo.spec.ts` exercita.
 *
 * ⚠️ **Roda antes do servidor subir, e isso não é detalhe.** No CI o
 * `webServer` do Playwright faz `npm run build`, que PRÉ-RENDERIZA `/cardapio`.
 * Se a semeadura acontecesse dentro do teste, o build já teria congelado a
 * página com o banco vazio e a suíte exercitaria um estado vazio achando que
 * exercitava conteúdo. O `globalSetup` corre antes do `webServer`; o
 * `beforeAll` de um spec, não.
 *
 * ⚠️ **Escreve no banco, então só age contra servidor local.** Apontar a suíte
 * para o site publicado e semear cardápio significaria escrever no Supabase de
 * produção. A verificação é aqui, em código, e não num comentário.
 *
 * A limpeza apaga por PREFIXO, nunca `deleteMany({})`: o banco local pode ter o
 * cardápio que alguém cadastrou à mão para conferir outra coisa.
 *
 * ⚠️ **Os nomes precisam ser impossíveis de confundir com comida de verdade, e
 * isso não é preciosismo.** As fixtures nasceram chamadas "Arroz branco",
 * "Peixe grelhado", "Talharim" e a categoria "Carnes", num banco vazio, onde
 * nada podia colidir. Em 03/09 o cardápio real entrou com 82 pratos e três
 * delas viraram ambíguas de uma vez: "Peixe grelhado" existe na segunda-feira,
 * o que derrubou a asserção de que ele só sai na sexta; "Talharim" existe como
 * formato da ilha e como "Talharim com brócolis" na quarta; e "Carnes" passou a
 * render dois títulos iguais na mesma aba.
 *
 * Nenhuma das três era defeito do site. Eram fixtures escolhidas com nome de
 * prato, num mundo onde prato de verdade ainda não existia.
 *
 * Por isso o nome agora diz o PAPEL da fixture no teste, e não um prato. Além
 * de não colidir, ele explica a asserção para quem for depurar: "prato de
 * segunda e quinta" some da aba de terça porque é o que o nome promete.
 */
const alvo = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export const rodaContraLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(
  alvo,
);

/** Prefixo dos registros deste teste. */
export const PREFIXO = "e2e-cardapio-";

export const CATEGORIAS = [
  { slug: `${PREFIXO}categoria-a`, nome: "Teste E2E · categoria A" },
  { slug: `${PREFIXO}categoria-b`, nome: "Teste E2E · categoria B" },
];

/**
 * Os nomes das fixtures, exportados para o spec não os repetir por escrito.
 * Repetidos, um renomear aqui deixaria o teste procurando um prato que já não
 * existe — e ele falharia com "elemento não encontrado", que manda quem depura
 * para o lugar errado.
 */
export const NOMES = {
  permanente: "Teste E2E · prato permanente",
  segundaEQuinta: "Teste E2E · prato de segunda e quinta",
  sexta: "Teste E2E · prato de sexta",
  massa: "Teste E2E · massa da ilha",
} as const;

export const PRATOS = [
  /** Sem dia marcado: tem de sair em todas as abas. */
  { slug: `${PREFIXO}permanente`, nome: NOMES.permanente, cat: 1, dias: [] as number[], kind: "BUFFET" as const },
  /** Só segunda e quinta: prova que a aba filtra. */
  { slug: `${PREFIXO}seg-qui`, nome: NOMES.segundaEQuinta, cat: 0, dias: [1, 4], kind: "BUFFET" as const },
  /** Só sexta: o par do de cima, para a troca de aba ser verificável nos dois sentidos. */
  { slug: `${PREFIXO}sexta`, nome: NOMES.sexta, cat: 0, dias: [5], kind: "BUFFET" as const },
  /** Seção própria, com preço à parte: não pode aparecer dentro de aba de dia. */
  { slug: `${PREFIXO}massa`, nome: NOMES.massa, cat: 1, dias: [], kind: "PASTA" as const },
];

export default async function semear() {
  if (!rodaContraLocal) {
    console.log(
      `[e2e] alvo é ${alvo}: a semeadura do cardápio NÃO roda fora do ambiente local.`,
    );
    return;
  }

  const prisma = new PrismaClient();
  try {
    const ids: Record<string, string> = {};
    for (const [i, c] of CATEGORIAS.entries()) {
      const linha = await prisma.menuCategory.upsert({
        where: { slug: c.slug },
        update: {},
        create: {
          slug: c.slug,
          name: { pt: c.nome },
          description: { pt: "" },
          order: i,
          published: true,
        },
      });
      ids[c.slug] = linha.id;
    }
    for (const p of PRATOS) {
      await prisma.menuItem.upsert({
        where: { slug: p.slug },
        update: { weekdays: p.dias, kind: p.kind },
        create: {
          slug: p.slug,
          categoryId: ids[CATEGORIAS[p.cat]!.slug]!,
          name: { pt: p.nome },
          description: { pt: "" },
          descriptionLong: { pt: "" },
          weekdays: p.dias,
          kind: p.kind,
          available: true,
          order: 0,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

export async function limpar() {
  if (!rodaContraLocal) return;
  const prisma = new PrismaClient();
  try {
    await prisma.menuItem.deleteMany({ where: { slug: { startsWith: PREFIXO } } });
    await prisma.menuCategory.deleteMany({ where: { slug: { startsWith: PREFIXO } } });
  } finally {
    await prisma.$disconnect();
  }
}
