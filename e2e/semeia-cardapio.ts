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
 */
const alvo = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export const rodaContraLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(
  alvo,
);

/** Prefixo dos registros deste teste. */
export const PREFIXO = "e2e-cardapio-";

export const CATEGORIAS = [
  { slug: `${PREFIXO}carnes`, nome: "Carnes" },
  { slug: `${PREFIXO}guarnicoes`, nome: "Guarnições" },
];

export const PRATOS = [
  /** Sem dia marcado: sai em todas as abas. */
  { slug: `${PREFIXO}arroz`, nome: "Arroz branco", cat: 1, dias: [] as number[], kind: "BUFFET" as const },
  /** Só segunda e quinta. */
  { slug: `${PREFIXO}assado`, nome: "Assado de panela", cat: 0, dias: [1, 4], kind: "BUFFET" as const },
  /** Só sexta. */
  { slug: `${PREFIXO}peixe`, nome: "Peixe grelhado", cat: 0, dias: [5], kind: "BUFFET" as const },
  /** Seção própria, com preço à parte. */
  { slug: `${PREFIXO}talharim`, nome: "Talharim", cat: 1, dias: [], kind: "PASTA" as const },
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
