/**
 * Carga do cardápio do Restaurante Prato.
 *
 * Os pratos vieram do cliente em 03/09/2026, em cinco listas — uma por dia
 * útil. Aqui cada prato entra UMA vez: "filé de frango grelhado" sai todos os
 * dias, e um cadastro por dia significaria corrigir a mesma linha cinco vezes.
 *
 * ⚠️ **Em 17/09/2026 chegou uma SEGUNDA SEMANA, e ela mudou a forma do
 * arquivo.** O cliente mandou dez listas — cinco dias × duas semanas — e a
 * rotação de duas semanas **não cabe no modelo**: `MenuItem.weekdays` é `Int[]`
 * de 1 a 5, sem dimensão de semana, aqui e no projeto irmão igualmente.
 *
 * O que se fez, e o porquê de cada metade:
 *
 * · a semana fica PRESERVADA nesta fonte, nos tokens de `PRATOS` — "3b" é a
 *   quarta-feira da segunda semana. Nenhum dado do cliente se perde;
 * · o banco recebe a UNIÃO, porque o dono do projeto confirmou que "as duas
 *   semanas estão valendo" e não há âncora de qual é a corrente. Sem âncora,
 *   publicar uma semana só acertaria metade das vezes — pior que publicar as
 *   duas.
 *
 * Dos 180 pratos nomeados que chegaram, 16 eram novos, e **todos os 16 são da
 * segunda semana**: a primeira semana do papel novo é o cardápio que este
 * arquivo já tinha. Vinte e quatro entradas eram variação de grafia
 * ("farota"→Farofa, "esfoliado"→Folheado, "porpetone"→Polpetone) e foram
 * normalizadas, como sempre.
 *
 * ⚠️ **Seis lacunas do próprio papel NÃO foram preenchidas por dedução** — três
 * itens vazios na segunda da 1ª semana, o nº 10 ausente na quarta da 2ª, e dois
 * nomes truncados. Estão nomeadas em `ESPERADO_POR_LISTA`, linha por linha.
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

/**
 * Quantos pratos cada LISTA do cliente tem. É a verificação embutida, e ela
 * passou de cinco contas para dez em 17/09/2026, quando chegou a segunda semana.
 *
 * ⚠️ Os números descontam as lacunas que o próprio papel deixou, nomeadas linha
 * por linha — para a conta poder ser refeita à mão, e para ninguém "fechar" o
 * total inventando prato.
 */
const ESPERADO_POR_LISTA = {
  "1a": 15, // 19 numerados, menos os itens 5, 11 e 14, que vieram vazios, menos o "pastel" sem recheio
  "2a": 18, // 18 numerados
  "3a": 19, // 19 numerados
  "4a": 18, // 19 numerados, menos o "pastel" sem recheio
  "5a": 18, // 19 numerados, menos o "pastel" sem recheio
  "1b": 18, // 18 numerados
  "2b": 18, // 19 numerados, menos o "pastel" sem recheio
  "3b": 16, // 19 numerados, menos o nº 10 (ausente), o "Meca à ..." ilegível e o "pastel" sem recheio
  "4b": 18, // 18 numerados
  "5b": 17, // 18 numerados, menos o "pastel" sem recheio
};

/**
 * Os pratos que vieram na lista de 03/09 e que a de 17/09 **não repete**.
 *
 * ⚠️ **Eles ficam, e isso é decisão do dono do projeto em 17/09: acrescentar,
 * não substituir.** Mas ficam SEPARADOS, e o motivo é que sem isso o guarda
 * acima passaria a mentir: os dez totais do papel novo não fecham se pratos de
 * outra procedência entram na mesma conta. Foi exatamente assim que esta carga
 * reprovou na primeira tentativa — o guarda fez o trabalho dele.
 *
 * ⚠️ E fica a pergunta que a separação torna visível, para o cliente: um buffet
 * roda, e prato que saiu não deveria seguir publicado. Nenhum destes aparece
 * nas dez listas novas. **Confirmar se ainda são servidos.**
 */
const HERDADOS_POR_DIA = {
  1: 4,
  2: 8,
  3: 5,
  4: 4,
};

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
  // ── Acompanhamentos ───────────────────────────────────────────────────
  ["Arroz", [], "acompanhamentos"],
  ["Arroz integral", [], "acompanhamentos"],
  ["Feijão", [], "acompanhamentos"],
  ["Feijão preto", ["3a", "3b"], "acompanhamentos"],
  ["Couve mineira", ["1a", "3a", "1b", "3b"], "acompanhamentos"],
  ["Ovos fritos", ["1a", "3a", "1b", "3b"], "acompanhamentos"],
  ["Farofa", ["1a", "2a", "3a", "5a", "1b", "2b", "3b", "4b", "5b"], "acompanhamentos"],
  ["Polenta", ["4a"], "acompanhamentos"],
  ["Arroz de limão siciliano", ["4a"], "acompanhamentos"],
  ["Arroz de fraldinha", ["2b"], "acompanhamentos"],
  ["Batata recheada com presunto e queijo", ["4b"], "acompanhamentos"],
  ["Creme de palmito na moranga", ["4a"], "acompanhamentos"],
  ["Couve-flor à dorê", ["4a", "4b"], "acompanhamentos"],
  ["Abobrinha recheada", ["5a"], "acompanhamentos"],
  ["Tempura de legumes", ["5a", "5b"], "acompanhamentos"],
  ["Abobrinha à dorê", ["5b"], "acompanhamentos"],
  ["Arroz com lentilha", ["4b"], "acompanhamentos"],
  ["Berinjela à milanesa", ["1b"], "acompanhamentos"],
  ["Brócolis à dorê", ["2b"], "acompanhamentos"],
  ["Feijão branco com dobradinha", ["2b"], "acompanhamentos"],
  ["Feijão tropeiro", ["1b"], "acompanhamentos"],

  // ── Carnes ────────────────────────────────────────────────────────────
  ["Bife à rolê", ["1a"], "carnes"],
  ["Torresmo e calabresa", ["1a", "3a", "1b", "3b"], "carnes"], // CONFIRMAR: no papel vem "torresmo/calabresa"
  ["Bife acebolado", ["2a"], "carnes"],
  ["Dobradinha", ["2a"], "carnes"],
  ["Polpetone de toscana", ["2a", "2b"], "carnes"],
  ["Carnes de feijoada", ["3a", "3b"], "carnes"],
  ["Strogonoff de carne", ["3a", "3b"], "carnes"],
  ["Hambúrguer de picanha", ["3a"], "carnes"],
  ["Rabada", ["4a"], "carnes"],
  ["Pernil", ["4a", "4b"], "carnes"],
  ["Fígado grelhado acebolado", ["4a"], "carnes"],
  ["Escondidinho de carne seca", ["4a", "4b"], "carnes"],
  ["Carne assada", ["5a", "5b"], "carnes"],
  ["Isca de carne acebolada", ["2b"], "carnes"],
  ["Picanha suína e lombo", ["1b"], "carnes"], // CONFIRMAR: no papel vem "picanha suina/ lombo"

  // ── Frangos ───────────────────────────────────────────────────────────
  ["Filé de frango grelhado", [], "frangos"], // CONFIRMAR: só a segunda da 1ª semana diz "grelhado"
  ["Frango à parmegiana", ["1a", "2b"], "frangos"],
  ["Chicken fried (sobrecoxa à dorê)", ["2a"], "frangos"],
  ["Frango crocante", ["3a"], "frangos"],
  ["Frango teriyaki", ["4a", "5b"], "frangos"],
  ["Peito assado", ["5a", "1b"], "frangos"],
  ["Isca de frango", ["1b"], "frangos"],
  ["Rocambole de frango com bacon", ["4b"], "frangos"],

  // ── Peixes e frutos do mar ────────────────────────────────────────────
  ["Peixe grelhado", ["1a", "1b"], "peixes-e-frutos-do-mar"],
  ["Peixe crocante", ["2a", "5a", "2b"], "peixes-e-frutos-do-mar"],
  ["Salmão grelhado", ["5a", "5b"], "peixes-e-frutos-do-mar"],
  ["Isca de peixe", ["5b"], "peixes-e-frutos-do-mar"],
  ["Pescada amarela", ["3a"], "peixes-e-frutos-do-mar"], // CONFIRMAR: no papel da 1ª semana vem "peixada amarela" — peixada é ensopado, pescada é o peixe
  ["Cação grelhado", ["4a", "4b"], "peixes-e-frutos-do-mar"],
  ["Bobó de camarão", ["5a", "5b"], "peixes-e-frutos-do-mar"],
  ["Risoto de frutos do mar", ["5a", "5b"], "peixes-e-frutos-do-mar"],
  ["Anchova ao molho de laranja", ["5a"], "peixes-e-frutos-do-mar"],

  // ── Massas e risotos ──────────────────────────────────────────────────
  ["Espaguete alho e óleo", ["1a", "1b"], "massas-e-risotos"],
  ["Nhoque de mandioquinha ao sugo", ["2b"], "massas-e-risotos"],
  ["Nhoque tradicional ao sugo", ["4b"], "massas-e-risotos"], // CONFIRMAR: no papel da 2ª semana vem só "nhoque ao sugo", e há dois ao sugo
  ["Lasanha de berinjela", ["2a"], "massas-e-risotos"],
  ["Rondeli de frango com catupiry", ["2a"], "massas-e-risotos"],
  ["Risoto de alho-poró", ["2a"], "massas-e-risotos"],
  ["Canelone de peito de peru", ["3a"], "massas-e-risotos"], // CONFIRMAR: no papel da 1ª semana vem "calzone peito de peru"
  ["Talharim com brócolis", ["3a", "3b"], "massas-e-risotos"],
  ["Nhoque recheado de três queijos", ["4a"], "massas-e-risotos"],
  ["Lasanha de presunto e queijo", ["4a", "2b"], "massas-e-risotos"],
  ["Yakissoba de legumes", ["5a", "5b"], "massas-e-risotos"],
  ["Penne com rúcula, tomate seco e queijo branco", ["5a", "4b"], "massas-e-risotos"], // CONFIRMAR: na 1ª semana o nome vem truncado: «Penne com rúcula "...."»
  ["Espaguete de frango", ["2b"], "massas-e-risotos"],
  ["Lasanha à margarida", ["4b"], "massas-e-risotos"], // CONFIRMAR: no papel vem "lasanha a margarida" — provavelmente à margherita
  ["Panqueca de carne", ["1b"], "massas-e-risotos"],
  ["Rondeli de peito de peru", ["3b"], "massas-e-risotos"],
  ["Talharim à carbonara", ["5b"], "massas-e-risotos"],

  // ── Fritos ────────────────────────────────────────────────────────────
  ["Salgados", ["1a", "2a", "3a", "4a", "5a", "1b", "2b", "3b", "4b"], "fritos"],
  ["Batata frita", ["1a", "2a", "3a", "4a", "5a", "2b", "3b", "4b", "5b"], "fritos"],
  ["Folheado de presunto e queijo", ["1a"], "fritos"],
  ["Pastel de brócolis", ["2a", "1b"], "fritos"],
  ["Mandioca frita", ["2a", "3b", "5b"], "fritos"],
  ["Pastel de siri", ["4b"], "fritos"],
  ["Pastel de queijo", ["3a"], "fritos"],

  // ── Outros ────────────────────────────────────────────────────────────
  ["Omelete de queijo branco e peito de peru", ["2a"], "outros"],
  ["Omelete de legumes", ["2b"], "outros"],
];

const PRATOS_HERDADOS = [
  // ── Acompanhamentos ───────────────────────────────────────────────────
  ["Tutu", [1], "acompanhamentos"],
  ["Purê de batata", [1, 4], "acompanhamentos"],
  ["Suflê de palmito", [2], "acompanhamentos"],

  // ── Carnes ────────────────────────────────────────────────────────────
  ["Copa-lombo com abacaxi", [1], "carnes"],
  ["Escalope ao molho madeira", [2], "carnes"],
  ["Feijoada completa", [3], "carnes"],
  ["Kafta", [3], "carnes"],

  // ── Frangos ───────────────────────────────────────────────────────────
  ["Peito assado ao molho fiorentina", [2], "frangos"],
  ["Peito assado com barbecue", [2], "frangos"],

  // ── Peixes e frutos do mar ────────────────────────────────────────────
  ["Peixe à dorê", [2], "peixes-e-frutos-do-mar"],
  ["Tainha com farofa de milho", [3], "peixes-e-frutos-do-mar"],
  ["Meca grelhada", [3], "peixes-e-frutos-do-mar"],

  // ── Massas e risotos ──────────────────────────────────────────────────
  ["Lasanha de quatro queijos", [2], "massas-e-risotos"],
  ["Quiche de alho-poró", [2], "massas-e-risotos"],
  ["Canelone de brócolis ao molho branco", [3], "massas-e-risotos"],
  ["Risoto margherita", [4], "massas-e-risotos"],

  // ── Fritos ────────────────────────────────────────────────────────────
  ["Pastel de carne", [1], "fritos"],
  ["Pastel de carne louca", [4], "fritos"],

  // ── Outros ────────────────────────────────────────────────────────────
  ["Rabanada", [2, 4], "outros"],
];

/**
 * O que vai para o banco: as duas procedências juntas.
 *
 * ⚠️ **A UNIÃO das duas semanas, porque `MenuItem.weekdays` não tem dimensão de
 * semana** — nem aqui nem no projeto irmão, que tem o mesmo campo. O dono do
 * projeto confirmou em 17/09 que "as duas semanas estão valendo", e não há
 * âncora de qual semana é a corrente; sem âncora, publicar uma só acertaria
 * metade das vezes, o que é pior que publicar as duas.
 *
 * **A semana fica preservada AQUI, na fonte**, nos tokens de `PRATOS` — "3b" é a
 * quarta da segunda semana. No dia em que a âncora existir, o dado já está
 * escrito e o que falta é só o modelo.
 *
 * Os herdados viram tokens da primeira semana, que é a procedência deles.
 *
 * ⚠️ **E a junção é POR CATEGORIA, não uma lista atrás da outra.** `order` é a
 * posição GLOBAL nesta lista, e concatenar dois blocos já agrupados faria um
 * acompanhamento herdado cair depois de um "outros" do papel novo — a sequência
 * de categorias passaria a mudar de aba para aba. É o defeito que o guarda de
 * blocos contíguos descreve, e ele reprovou esta carga até a junção virar isto.
 */
const TODOS_OS_PRATOS = CATEGORIAS.flatMap(([slug]) => [
  ...PRATOS.filter(([, , cat]) => cat === slug),
  ...PRATOS_HERDADOS.filter(([, , cat]) => cat === slug).map(([nome, dias, cat]) => [
    nome,
    dias.length === 0 ? [] : dias.map((d) => `${d}a`),
    cat,
  ]),
]);

/** "Copa-lombo com abacaxi" → "copa-lombo-com-abacaxi". */
function slugificar(nome) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Os dias da semana (1 a 5) em que o prato sai, derivados das listas do cliente.
 *
 * ⚠️ A entrada são TOKENS de lista: "3b" é a quarta-feira da SEGUNDA semana.
 * Lista vazia significa todas as dez.
 */
function diasDe(listas) {
  if (listas.length === 0) return [1, 2, 3, 4, 5];
  return [...new Set(listas.map((l) => Number(l[0])))].sort();
}

/** Um prato está nesta lista do cliente? Lista vazia significa todas. */
function estaNaLista(listas, lista) {
  return listas.length === 0 || listas.includes(lista);
}

function verificar() {
  const problemas = [];

  const slugs = TODOS_OS_PRATOS.map(([nome]) => slugificar(nome));
  const repetidos = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (repetidos.length) problemas.push(`slug repetido: ${[...new Set(repetidos)].join(", ")}`);

  for (const [nome, dias, cat] of TODOS_OS_PRATOS) {
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
  for (const [, , cat] of TODOS_OS_PRATOS) {
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

  // A verificação que importa: cada uma das DEZ listas do papel de 17/09 fecha.
  for (const [lista, esperado] of Object.entries(ESPERADO_POR_LISTA)) {
    const total = PRATOS.filter(([, listas]) => estaNaLista(listas, lista)).length;
    if (total !== esperado) {
      problemas.push(`lista ${lista}: ${total} pratos, esperado ${esperado}`);
    }
  }

  // E os herdados de 03/09 fecham à parte, cada um na sua procedência.
  for (const [dia, esperado] of Object.entries(HERDADOS_POR_DIA)) {
    const total = PRATOS_HERDADOS.filter(([, dias]) =>
      (dias.length === 0 ? [1, 2, 3, 4, 5] : dias).includes(Number(dia)),
    ).length;
    if (total !== esperado) {
      problemas.push(`herdados do dia ${dia}: ${total} pratos, esperado ${esperado}`);
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

  // Conta de novo aqui, em vez de imprimir `ESPERADO_POR_LISTA`: uma saída que
  // ecoa a constante parece verificação e não é nenhuma.
  const porDia = Object.keys(ESPERADO_POR_LISTA)
    .map((lista) => {
      const total = PRATOS.filter(([, listas]) => estaNaLista(listas, lista)).length;
      return `${lista}:${total}`;
    })
    .join("  ");
  console.log(`${TODOS_OS_PRATOS.length} pratos (${PRATOS.length} do papel de 17/09 + ${PRATOS_HERDADOS.length} herdados), ${CATEGORIAS.length} categorias`);
  console.log(`pratos do papel novo, por lista  ${porDia}  (conferido contra a lista do cliente)`);

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
    for (const [nome, listas, cat] of TODOS_OS_PRATOS) {
      /*
       * ⚠️ `diasDe()` converte TOKEN em dia, e sem ela isto gravava string num
       * campo `Int[]`. O `--dry-run` não pega — ele não escreve — e o que
       * apontou foi o lint, avisando que `diasDe` tinha ficado sem uso depois
       * de os tokens entrarem. Aviso de variável não usada como sintoma de
       * conversão esquecida.
       */
      const dias = diasDe(listas);
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
