/**
 * Carga do cardápio da semana do Restaurante Prato.
 *
 * Os pratos vieram do cliente em 03/09/2026, em cinco listas — uma por dia
 * útil. Aqui cada prato entra UMA vez: "filé de frango grelhado" sai todos os
 * dias, e um cadastro por dia significaria corrigir a mesma linha cinco vezes.
 *
 * ⚠️ **As descrições ficam vazias, de propósito.** O cliente mandou só os nomes.
 * Escrever "marinado por 24 horas" ou "ao molho da casa" num cardápio é
 * inventar dado do cliente, e é o tipo de erro que chega à mesa. A linha do
 * cardápio já trata descrição ausente: sai só o nome, que é exatamente o que a
 * lista de papel faz.
 *
 * ⚠️ **Isto NÃO é o `prisma/seed.ts`.** Aquele cria o admin. Este é conteúdo, e
 * conteúdo não viaja no git: o banco local e o de produção são separados. Por
 * isso o script é versionado — roda contra produção quando você quiser, e fica
 * repetível se o banco precisar ser restaurado.
 *
 * Uso:
 *   node scripts/importa-cardapio.mjs --dry-run    # confere sem escrever
 *   node scripts/importa-cardapio.mjs              # escreve
 *
 * É idempotente: os pratos são casados por slug, então rodar de novo atualiza
 * o que mudou aqui sem duplicar nada. **Mas sobrescreve edições feitas no
 * painel para esses mesmos slugs** — quem editar pelo painel e depois rodar
 * isto perde a edição.
 */
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const DRY = process.argv.includes("--dry-run");

/** O CLI do Prisma carrega o `.env` sozinho; um script solto, não. */
function carregaEnv() {
  if (!existsSync(".env")) return;
  for (const linha of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(linha.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

/**
 * As categorias, na ordem em que aparecem dentro de cada aba de dia.
 *
 * ⚠️ **No Prato elas são VISÍVEIS**, ao contrário do projeto irmão: a página
 * agrupa os pratos por categoria dentro da aba do dia, e o nome sai como
 * título da subseção. Então estes nomes são copy, não organização interna — e
 * o cliente pode renomeá-los pelo painel sem tocar em código.
 */
const CATEGORIAS = [
  ["acompanhamentos", "Acompanhamentos"],
  ["carnes", "Carnes"],
  ["frangos", "Frangos"],
  ["peixes-e-frutos-do-mar", "Peixes e frutos do mar"],
  ["massas-e-risotos", "Massas e risotos"],
  ["fritos", "Fritos"],
  ["outros", "Outros"],
];

/** Quantos pratos cada dia tem na lista do cliente. É a verificação embutida. */
const ESPERADO_POR_DIA = { 1: 19, 2: 32, 3: 26, 4: 23, 5: 19 };

/**
 * O cardápio: `[nome, dias, categoria]`. `dias` vazio significa TODO DIA — é o
 * que a consulta `pratosDoDia` entende, e é mais honesto que repetir
 * `[1,2,3,4,5]` em seis pratos.
 *
 * A ortografia foi normalizada (maiúsculas, acentos, erros claros de digitação);
 * a redação é a do cliente. Os casos em que eu não consegui decidir o que o
 * prato é estão listados no relatório e marcados com `CONFIRMAR` aqui.
 */
const PRATOS = [
  // ── Acompanhamentos ─────────────────────────────────────────────────────
  ["Arroz", [], "acompanhamentos"],
  ["Arroz integral", [], "acompanhamentos"],
  ["Feijão", [], "acompanhamentos"],
  ["Feijão preto", [3], "acompanhamentos"],
  ["Tutu", [1], "acompanhamentos"],
  ["Couve mineira", [1, 3], "acompanhamentos"],
  ["Ovos fritos", [1, 3], "acompanhamentos"],
  ["Purê de batata", [1, 4], "acompanhamentos"],
  ["Farofa", [1, 2, 3, 5], "acompanhamentos"],
  ["Polenta", [4], "acompanhamentos"],
  ["Arroz de limão siciliano", [2, 4], "acompanhamentos"],
  ["Arroz de fraldinha", [2], "acompanhamentos"],
  ["Batata recheada com presunto e queijo", [2], "acompanhamentos"],
  ["Suflê de palmito", [2], "acompanhamentos"],
  ["Creme de palmito na moranga", [4], "acompanhamentos"],
  ["Couve-flor à dorê", [4], "acompanhamentos"],
  ["Abobrinha recheada", [5], "acompanhamentos"],
  ["Tempura de legumes", [5], "acompanhamentos"],

  // ── Carnes ──────────────────────────────────────────────────────────────
  ["Copa-lombo com abacaxi", [1], "carnes"],
  ["Bife à rolê", [1], "carnes"],
  ["Torresmo e calabresa", [1, 3], "carnes"], // CONFIRMAR: no papel vem "torresmo/calabresa"
  ["Bife acebolado", [2], "carnes"],
  ["Escalope ao molho madeira", [2], "carnes"],
  ["Dobradinha", [2], "carnes"],
  ["Polpetone de toscana", [2], "carnes"],
  ["Carnes de feijoada", [3], "carnes"],
  ["Feijoada completa", [3], "carnes"], // CONFIRMAR: no papel vem "Feijão completa"
  ["Kafta", [3], "carnes"],
  ["Strogonoff de carne", [3], "carnes"],
  ["Hambúrguer de picanha", [3], "carnes"],
  ["Rabada", [4], "carnes"],
  ["Pernil", [4], "carnes"],
  ["Fígado grelhado acebolado", [4], "carnes"],
  ["Escondidinho de carne seca", [4], "carnes"],
  ["Carne assada", [5], "carnes"],

  // ── Frangos ─────────────────────────────────────────────────────────────
  ["Filé de frango grelhado", [], "frangos"], // CONFIRMAR: só segunda diz "grelhado"
  ["Frango à parmegiana", [1], "frangos"],
  ["Peito assado ao molho fiorentina", [2], "frangos"],
  ["Peito assado com barbecue", [2], "frangos"],
  ["Chicken fried (sobrecoxa à dorê)", [2], "frangos"],
  ["Frango crocante", [3], "frangos"],
  ["Frango teriyaki", [4], "frangos"],
  ["Peito assado", [5], "frangos"],

  // ── Peixes e frutos do mar ──────────────────────────────────────────────
  ["Peixe grelhado", [1], "peixes-e-frutos-do-mar"],
  ["Peixe à dorê", [2], "peixes-e-frutos-do-mar"],
  ["Peixe crocante", [2, 5], "peixes-e-frutos-do-mar"],
  ["Salmão grelhado", [2, 5], "peixes-e-frutos-do-mar"],
  ["Tainha com farofa de milho", [3], "peixes-e-frutos-do-mar"],
  ["Isca de peixe", [3], "peixes-e-frutos-do-mar"],
  ["Pescada amarela", [3], "peixes-e-frutos-do-mar"],
  ["Meca grelhada", [3], "peixes-e-frutos-do-mar"],
  ["Cação grelhado", [4], "peixes-e-frutos-do-mar"],
  ["Bobó de camarão", [5], "peixes-e-frutos-do-mar"],
  ["Risoto de frutos do mar", [5], "peixes-e-frutos-do-mar"],
  ["Anchova ao molho de laranja", [5], "peixes-e-frutos-do-mar"],

  // ── Massas e risotos ────────────────────────────────────────────────────
  ["Espaguete alho e óleo", [1], "massas-e-risotos"],
  ["Nhoque de mandioquinha ao sugo", [2], "massas-e-risotos"],
  ["Nhoque tradicional ao sugo", [2], "massas-e-risotos"],
  ["Lasanha de quatro queijos", [2], "massas-e-risotos"],
  ["Lasanha de berinjela", [2], "massas-e-risotos"],
  ["Rondeli de frango com catupiry", [2], "massas-e-risotos"],
  ["Risoto de alho-poró", [2], "massas-e-risotos"],
  ["Quiche de alho-poró", [2], "massas-e-risotos"], // CONFIRMAR: no papel vem "Quiche de alho ao molho poro"
  ["Canelone de brócolis ao molho branco", [3], "massas-e-risotos"],
  ["Canelone de peito de peru", [3], "massas-e-risotos"],
  ["Talharim com brócolis", [3], "massas-e-risotos"],
  ["Nhoque recheado de três queijos", [4], "massas-e-risotos"],
  ["Lasanha de presunto e queijo", [4], "massas-e-risotos"],
  ["Risoto margherita", [4], "massas-e-risotos"], // CONFIRMAR: no papel vem "Risoto marguerida"
  ["Yakissoba de legumes", [5], "massas-e-risotos"],
  ["Penne com rúcula, tomate seco e queijo branco", [5], "massas-e-risotos"],

  // ── Fritos ──────────────────────────────────────────────────────────────
  ["Salgados", [], "fritos"],
  ["Batata frita", [], "fritos"],
  ["Pastel de carne", [1], "fritos"],
  ["Folheado de presunto e queijo", [1], "fritos"], // CONFIRMAR: no papel vem "Xesfoliado de presunto e queijoX"
  ["Pastel de brócolis", [2], "fritos"],
  ["Mandioca frita", [2], "fritos"],
  ["Pastel de siri", [3], "fritos"],
  ["Pastel de queijo", [3, 4, 5], "fritos"],
  ["Pastel de carne louca", [4], "fritos"],

  // ── Outros ──────────────────────────────────────────────────────────────
  ["Rabanada", [2, 4], "outros"],
  ["Omelete de queijo branco e peito de peru", [2], "outros"],
];

/** "Copa-lombo com abacaxi" → "copa-lombo-com-abacaxi". */
function slugificar(nome) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Os dias em que o prato sai. Lista vazia significa todos. */
function diasDe(dias) {
  return dias.length === 0 ? [1, 2, 3, 4, 5] : dias;
}

function verificar() {
  const problemas = [];

  const slugs = PRATOS.map(([nome]) => slugificar(nome));
  const repetidos = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (repetidos.length) problemas.push(`slug repetido: ${[...new Set(repetidos)].join(", ")}`);

  for (const [nome, dias, cat] of PRATOS) {
    if (!CATEGORIAS.some(([slug]) => slug === cat)) {
      problemas.push(`${nome}: categoria desconhecida "${cat}"`);
    }
    if (dias.some((d) => d < 1 || d > 5)) {
      problemas.push(`${nome}: dia fora de 1..5 (${dias.join(",")})`);
    }
    if (dias.length === 5) {
      problemas.push(`${nome}: use [] em vez de [1,2,3,4,5]`);
    }
  }

  /*
   * A lista tem de estar AGRUPADA por categoria, na ordem de `CATEGORIAS`.
   *
   * É disso que depende a ordem global de `order` produzir a mesma sequência de
   * categorias em todos os dias. Espalhar dois pratos da mesma categoria em
   * blocos separados aqui não quebra nada de forma visível: a página desenha, os
   * pratos certos aparecem no dia certo, e a sequência de categorias passa a
   * mudar de aba para aba. Foi exatamente o defeito que apareceu na primeira
   * importação, e só a tela mostrou.
   */
  const blocos = [];
  for (const [, , cat] of PRATOS) {
    if (blocos[blocos.length - 1] !== cat) blocos.push(cat);
  }
  const repartidas = blocos.filter((c, i) => blocos.indexOf(c) !== i);
  if (repartidas.length) {
    problemas.push(
      `categoria em blocos separados: ${[...new Set(repartidas)].join(", ")}`,
    );
  }
  const ordemEsperada = CATEGORIAS.map(([slug]) => slug).filter((s) =>
    blocos.includes(s),
  );
  if (blocos.join(">") !== ordemEsperada.join(">")) {
    problemas.push(
      `ordem dos blocos difere de CATEGORIAS:\n      lista: ${blocos.join(" > ")}\n      esperado: ${ordemEsperada.join(" > ")}`,
    );
  }

  // A verificação que importa: cada dia tem de fechar com a lista do cliente.
  for (const [dia, esperado] of Object.entries(ESPERADO_POR_DIA)) {
    const total = PRATOS.filter(([, dias]) => diasDe(dias).includes(Number(dia))).length;
    if (total !== esperado) {
      problemas.push(`dia ${dia}: ${total} pratos, esperado ${esperado}`);
    }
  }

  return problemas;
}

async function main() {
  carregaEnv();

  const problemas = verificar();
  if (problemas.length) {
    console.error("A lista não fecha com o cardápio do cliente:\n");
    for (const p of problemas) console.error("  ✗", p);
    process.exit(1);
  }

  // Conta de novo aqui, em vez de imprimir `ESPERADO_POR_DIA`: uma saída que
  // ecoa a constante parece verificação e não é nenhuma.
  const porDia = Object.keys(ESPERADO_POR_DIA)
    .map((d) => {
      const total = PRATOS.filter(([, dias]) => diasDe(dias).includes(Number(d))).length;
      return `${d}:${total}`;
    })
    .join("  ");
  console.log(`${PRATOS.length} pratos, ${CATEGORIAS.length} categorias`);
  console.log(`pratos por dia  ${porDia}  (conferido contra a lista do cliente)`);

  if (DRY) {
    console.log("\namostra de slug:");
    for (const nome of [
      "Copa-lombo com abacaxi",
      "Feijão",
      "Couve-flor à dorê",
      "Peixe à dorê",
      "Hambúrguer de picanha",
    ]) {
      console.log("  ", nome.padEnd(38), "->", slugificar(nome));
    }
    console.log("\n--dry-run: nada foi escrito.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const ids = {};
    for (const [i, [slug, nome]] of CATEGORIAS.entries()) {
      const linha = await prisma.menuCategory.upsert({
        where: { slug },
        update: { name: { pt: nome }, order: i, published: true },
        create: {
          slug,
          name: { pt: nome },
          description: { pt: "" },
          order: i,
          published: true,
        },
      });
      ids[slug] = linha.id;
    }

    /*
     * ⚠️ **A ordem é GLOBAL, não por categoria.** Contar dentro de cada
     * categoria parece natural e produz um defeito visível: a consulta ordena
     * por `order` e depois por slug, sem saber a que categoria o prato
     * pertence, então todos os "1" se misturam. O agrupamento da página mantém
     * a ordem da PRIMEIRA aparição, e o resultado era a sequência de
     * categorias mudando de um dia para o outro — segunda abrindo por Carnes,
     * terça por Frangos, "Outros" caindo no meio. Quem lê dois dias seguidos
     * reaprende a página a cada aba.
     *
     * Com ordem global, o `order` carrega a ordem desta lista, que já está
     * agrupada na sequência de `CATEGORIAS`. A página passa a mostrar as
     * categorias sempre na mesma ordem, em todos os dias.
     */
    let posicao = 0;
    for (const [nome, dias, cat] of PRATOS) {
      posicao += 1;
      const slug = slugificar(nome);
      await prisma.menuItem.upsert({
        where: { slug },
        update: {
          name: { pt: nome },
          weekdays: dias,
          kind: "BUFFET",
          categoryId: ids[cat],
          order: posicao,
          available: true,
        },
        create: {
          slug,
          categoryId: ids[cat],
          name: { pt: nome },
          // Vazias de propósito: o cliente mandou só os nomes.
          description: { pt: "" },
          descriptionLong: { pt: "" },
          weekdays: dias,
          kind: "BUFFET",
          available: true,
          order: posicao,
        },
      });
    }
    console.log("\nCardápio importado.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
