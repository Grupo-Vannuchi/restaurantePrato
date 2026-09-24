/**
 * Carga do cardápio do Restaurante Prato.
 *
 * Os pratos vieram do cliente em 03/09/2026, em cinco listas — uma por dia
 * útil. Aqui cada prato entra UMA vez: "filé de frango grelhado" sai todos os
 * dias, e um cadastro por dia significaria corrigir a mesma linha cinco vezes.
 *
 * ⚠️ **Em 17/09/2026 chegou uma SEGUNDA SEMANA, e em 21/09 uma TERCEIRA.** São
 * quinze listas — cinco dias × três semanas — e a rotação **não cabe no
 * modelo**: `MenuItem.weekdays` é `Int[]` de 1 a 5, sem dimensão de semana,
 * aqui e no projeto irmão igualmente.
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
 * Dos 180 pratos nomeados que chegaram em 17/09, 16 eram novos, e **todos os 16
 * eram da segunda semana**: a primeira semana daquele papel é o cardápio que
 * este arquivo já tinha. Vinte e quatro entradas eram variação de grafia
 * ("farota"→Farofa, "esfoliado"→Folheado, "porpetone"→Polpetone) e foram
 * normalizadas, como sempre.
 *
 * A terceira semana, de 21/09, trouxe **13 pratos novos** — berinjela ao forno,
 * arroz de alho-poró, anchova à mineira, talharim com camarão, canelone de
 * presunto e queijo, lasanha de peito de peru, penne à calabresa, rocambole de
 * carne, suflê de brócolis, frango assado (sobrecoxa), bacalhau com batatas,
 * camarão à paulista e fraldinha na cerveja preta. Mesma normalização de grafia
 * ("berinjala"→berinjela, "mileanesa"→milanesa, "quijo"→queijo, "teriaki"→
 * teriyaki, "strogonof"→Strogonoff).
 *
 * ⚠️ **E um prato VOLTOU da lista herdada:** o purê de batata, que estava em
 * `PRATOS_HERDADOS` por não constar do papel de 17/09, aparece na segunda da
 * terceira semana. Ver a nota dele — ele sai de quinta no mesmo movimento, e
 * isso é uma pergunta para o cliente.
 *
 * ⚠️ **As lacunas do próprio papel NÃO foram preenchidas por dedução.** São
 * onze, e cada uma está nomeada em `ESPERADO_POR_LISTA`, linha por linha: três
 * itens vazios na segunda da 1ª semana; o nº 10 ausente na quarta da 2ª; o nº 5
 * ausente na terça da 3ª; o nº 13 vindo como `**` na sexta da 3ª; uma farofa
 * repetida em dois números na mesma lista; e quatro nomes que chegaram
 * truncados ou genéricos demais para virar prato — `Penne com rúcula "...."`,
 * `Meca à "..."`, `Sfogliatti` e um `omelete` sem recheio, num cardápio que já
 * tem duas omeletes diferentes.
 *
 * O `omelete` segue a mesma regra que já valia para o `pastel` sem recheio:
 * escolher qual das duas seria inventar dado do cliente.
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
 * cresceu com os papéis: cinco contas em 03/09, dez em 17/09 e **quinze em
 * 21/09/2026**, quando chegou a terceira semana.
 *
 * ⚠️ Os números descontam as lacunas que o próprio papel deixou, nomeadas linha
 * por linha — para a conta poder ser refeita à mão, e para ninguém "fechar" o
 * total inventando prato.
 */
/*
 * ⚠️ **As três quartas são a MESMA lista desde 23/09/2026, e isso é entrega do
 * cliente, não simplificação minha.** Veio um quadro novo de quarta — vinte
 * linhas, dezenove pratos aqui porque "torresmo" e "calabresa" são uma entrada
 * só — com a instrução de que a quarta passa a ser esse. O dono do projeto
 * decidiu que ele substitui as três semanas, não uma.
 *
 * O quadro é o da 2ª semana com a letra legível: "talharim c/brócolis" e
 * "rondelli de peito de peru" só existiam em `3b`, e o cliente corrigiu os dois
 * de viva voz (camarão; canelone de presunto e queijo). O nº 10, que `3b` tinha
 * como "Meca à ..." ilegível, é **anchova negra à meunière** — e isso desfaz um
 * erro meu: `3c` trazia "Anchova à mineira", que é outro preparo.
 *
 * ⚠️ Saíram nove pratos do site inteiro, e a lista fica aqui porque um dia
 * alguém vai perguntar: hambúrguer de picanha, pescada amarela, canelone de
 * peito de peru, talharim com brócolis, e os cinco herdados de 03/09 — feijoada
 * completa, kafta, tainha com farofa de milho, meca grelhada e canelone de
 * brócolis ao molho branco. O rondelli continua no site: ele também é servido
 * na terça da 3ª semana.
 */
const ESPERADO_POR_LISTA = {
  "1a": 15, // 19 numerados, menos os itens 5, 11 e 14, que vieram vazios, menos o "pastel" sem recheio
  "2a": 18, // 18 numerados
  "3a": 19, // as três quartas são a mesma lista desde 23/09 — ver a nota
  "4a": 18, // 19 numerados, menos o "pastel" sem recheio
  "5a": 18, // 19 numerados, menos o "pastel" sem recheio
  "1b": 18, // 18 numerados
  "2b": 18, // 19 numerados, menos o "pastel" sem recheio
  "3b": 19, // idem
  "4b": 18, // 18 numerados
  "5b": 17, // 18 numerados, menos o "pastel" sem recheio
  // ── Terceira semana, chegada em 21/09/2026 ──────────────────────────────
  "1c": 18, // 19 numerados, menos o "pastel" sem recheio
  "2c": 15, // 19 numerados, menos o nº 5 (ausente), o "omelete" sem recheio, o "Sfogliatti" e o "pastel"
  "3c": 19, // idem
  "4c": 17, // 18 numerados, menos o "pastel" sem recheio
  "5c": 16, // 19 numerados, menos o nº 13 ("**"), a farofa repetida no nº 14 e o "pastel"
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
/*
 * ⚠️ **O dia 3 zerou em 23/09/2026, e a pergunta acima foi RESPONDIDA para
 * ele.** Os cinco herdados da quarta não aparecem no quadro completo que o
 * cliente mandou nesta data — depois de não aparecerem nos papéis de 17/09 e
 * 21/09 também. Três ausências seguidas num quadro que se diz completo é
 * resposta, e eles saíram do array.
 *
 * ⚠️ Saíram do ARRAY, não ficaram com `dias` vazio: vazio significa TODO DIA
 * nesta estrutura, então esvaziar os cinco os publicaria na semana inteira —
 * o oposto exato do que a entrega diz.
 *
 * Os dias 1, 2 e 4 continuam com a pergunta em aberto.
 */
const HERDADOS_POR_DIA = {
  1: 3,
  2: 8,
  3: 0, // zerado em 23/09 — ver a nota acima
  4: 3,
};

/**
 * Pratos que SAEM do banco, por slug.
 *
 * ⚠️ **Esta lista existe porque o resto do script só faz `upsert`, e upsert não
 * apaga nada.** Tirar um prato do array acima muda o que a carga escreve e não
 * muda nada do que já está escrito: o prato continua no banco, continua
 * publicado e continua aparecendo na aba do dia. A troca de quarta de 23/09
 * seria exatamente isso — nove pratos "removidos" que seguiriam no ar, com a
 * carga verde dizendo que deu certo.
 *
 * ⚠️ **É uma lista NOMEADA de propósito, e não "apague tudo que não está no
 * array".** A varredura cega é fácil de escrever e apagaria junto o que o
 * cliente cadastrar pelo painel, que é justamente o trabalho que ninguém tem
 * como refazer. Cada saída aqui tem slug, data e motivo.
 *
 * Não achar um slug não é erro — quer dizer que a saída já aconteceu numa carga
 * anterior. A carga reporta os dois casos.
 */
const REMOVIDOS = [
  // ── 23/09/2026 · o quadro novo de quarta substitui as três semanas ──────
  { slug: "hamburguer-de-picanha", motivo: "fora do quadro de quarta de 23/09" },
  { slug: "pescada-amarela", motivo: "fora do quadro de quarta de 23/09" },
  { slug: "canelone-de-peito-de-peru", motivo: "fora do quadro de quarta de 23/09" },
  { slug: "talharim-com-brocolis", motivo: "o cliente trocou por talharim com camarão" },
  // Os cinco herdados de 03/09 que a quarta nunca repetiu.
  { slug: "feijoada-completa", motivo: "herdado de 03/09, ausente dos três papéis seguintes" },
  { slug: "kafta", motivo: "herdado de 03/09, ausente dos três papéis seguintes" },
  { slug: "tainha-com-farofa-de-milho", motivo: "herdado de 03/09, ausente dos três papéis seguintes" },
  { slug: "meca-grelhada", motivo: "herdado de 03/09, ausente dos três papéis seguintes" },
  { slug: "canelone-de-brocolis-ao-molho-branco", motivo: "herdado de 03/09, ausente dos três papéis seguintes" },
  /*
   * ⚠️ Este não saiu do cardápio — MUDOU DE NOME, e por isso mudou de slug.
   * "Anchova à mineira" era minha leitura de um item que o papel da 2ª semana
   * trazia ilegível; o cliente confirmou em 23/09 que é "anchova negra à
   * meunière", que é outro preparo. O upsert cria o slug novo e deixa o velho
   * publicado do lado — dois peixes na aba de quarta, um deles inventado por mim.
   */
  { slug: "anchova-a-mineira", motivo: "renomeado para anchova-negra-a-meuniere em 23/09" },
];


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
  ["Feijão preto", ["3a", "3b", "3c"], "acompanhamentos"],
  ["Couve mineira", ["1a", "3a", "1b", "3b", "1c", "3c"], "acompanhamentos"],
  ["Ovos fritos", ["1a", "3a", "1b", "3b", "1c", "3c"], "acompanhamentos"],
  ["Farofa", ["1a", "2a", "3a", "5a", "1b", "2b", "3b", "4b", "5b", "1c", "2c", "3c", "4c", "5c"], "acompanhamentos"],
  ["Polenta", ["4a"], "acompanhamentos"],
  ["Arroz de limão siciliano", ["4a", "4c"], "acompanhamentos"],
  ["Arroz de fraldinha", ["2b"], "acompanhamentos"],
  ["Batata recheada com presunto e queijo", ["4b"], "acompanhamentos"],
  ["Creme de palmito na moranga", ["4a"], "acompanhamentos"],
  ["Couve-flor à dorê", ["4a", "4b"], "acompanhamentos"],
  ["Abobrinha recheada", ["5a"], "acompanhamentos"],
  ["Tempura de legumes", ["5a", "5b", "5c"], "acompanhamentos"],
  ["Abobrinha à dorê", ["5b"], "acompanhamentos"],
  ["Arroz com lentilha", ["4b"], "acompanhamentos"],
  ["Berinjela à milanesa", ["1b"], "acompanhamentos"],
  ["Brócolis à dorê", ["2b", "2c"], "acompanhamentos"],
  ["Feijão branco com dobradinha", ["2b"], "acompanhamentos"],
  ["Feijão tropeiro", ["1b", "1c"], "acompanhamentos"],
  ["Berinjela ao forno", ["1c"], "acompanhamentos"],
  ["Arroz de alho-poró", ["2c"], "acompanhamentos"],
  ["Suflê de brócolis", ["4c"], "acompanhamentos"],
  /*
   * ⚠️ **Voltou da lista herdada em 21/09/2026** — ele estava em
   * `PRATOS_HERDADOS` porque o papel de 17/09 nao o repetia, e o de 21/09
   * traz de volta, na segunda da terceira semana.
   *
   * ⚠️ E sai de QUINTA. Na lista de 03/09 ele era servido nos dias 1 e 4; a
   * unica evidencia da quinta era aquela lista, e dois papeis depois ela nao
   * se repetiu. Seguir afirmando a quinta seria manter no ar um dia que
   * nenhum documento atual sustenta. **Confirmar com o cliente se ele ainda
   * sai na quinta.**
   */
  ["Purê de batata", ["1c"], "acompanhamentos"],

  // ── Carnes ────────────────────────────────────────────────────────────
  ["Bife à rolê", ["1a", "1c"], "carnes"],
  ["Torresmo e calabresa", ["1a", "3a", "1b", "3b", "1c", "3c"], "carnes"], // CONFIRMAR: no papel vem "torresmo/calabresa"
  ["Bife acebolado", ["2a"], "carnes"],
  ["Dobradinha", ["2a"], "carnes"],
  ["Polpetone de toscana", ["2a", "2b", "2c"], "carnes"],
  ["Carnes de feijoada", ["3a", "3b", "3c"], "carnes"],
  ["Strogonoff de carne", ["3a", "3b", "3c"], "carnes"],
  ["Rabada", ["4a", "2c"], "carnes"],
  ["Pernil", ["4a", "4b", "4c"], "carnes"],
  ["Fígado grelhado acebolado", ["4a"], "carnes"],
  ["Escondidinho de carne seca", ["4a", "4b", "4c"], "carnes"],
  ["Carne assada", ["5a", "5b"], "carnes"],
  ["Isca de carne acebolada", ["2b"], "carnes"],
  ["Rocambole de carne", ["4c"], "carnes"],
  ["Fraldinha na cerveja preta", ["5c"], "carnes"],
  ["Picanha suína e lombo", ["1b", "1c"], "carnes"], // CONFIRMAR: no papel vem "picanha suina/ lombo"

  // ── Frangos ───────────────────────────────────────────────────────────
  ["Filé de frango grelhado", [], "frangos"], // CONFIRMAR: só a segunda da 1ª semana diz "grelhado"
  ["Frango à parmegiana", ["1a", "2b"], "frangos"],
  ["Chicken fried (sobrecoxa à dorê)", ["2a", "2c"], "frangos"],
  ["Frango crocante", ["3a", "3b", "3c"], "frangos"],
  ["Frango teriyaki", ["4a", "5b", "5c"], "frangos"],
  ["Peito assado", ["5a", "1b"], "frangos"],
  ["Isca de frango", ["1b", "1c"], "frangos"],
  ["Rocambole de frango com bacon", ["4b"], "frangos"],
  ["Frango assado (sobrecoxa)", ["4c"], "frangos"],

  // ── Peixes e frutos do mar ────────────────────────────────────────────
  ["Peixe grelhado", ["1a", "1b", "1c"], "peixes-e-frutos-do-mar"],
  ["Peixe crocante", ["2a", "5a", "2b", "2c"], "peixes-e-frutos-do-mar"],
  ["Salmão grelhado", ["5a", "5b"], "peixes-e-frutos-do-mar"],
  ["Isca de peixe", ["5b", "5c"], "peixes-e-frutos-do-mar"],
  ["Cação grelhado", ["4a", "4b", "4c"], "peixes-e-frutos-do-mar"],
  ["Bobó de camarão", ["5a", "5b"], "peixes-e-frutos-do-mar"],
  ["Risoto de frutos do mar", ["5a", "5b", "5c"], "peixes-e-frutos-do-mar"],
  ["Anchova ao molho de laranja", ["5a"], "peixes-e-frutos-do-mar"],
  ["Anchova negra à meunière", ["3a", "3b", "3c"], "peixes-e-frutos-do-mar"],
  ["Bacalhau com batatas", ["5c"], "peixes-e-frutos-do-mar"],
  ["Camarão à paulista", ["5c"], "peixes-e-frutos-do-mar"],

  // ── Massas e risotos ──────────────────────────────────────────────────
  ["Espaguete alho e óleo", ["1a", "1b", "1c"], "massas-e-risotos"],
  ["Nhoque de mandioquinha ao sugo", ["2b"], "massas-e-risotos"],
  ["Nhoque tradicional ao sugo", ["4b", "2c", "4c"], "massas-e-risotos"], // CONFIRMAR: no papel da 2ª semana vem só "nhoque ao sugo", e há dois ao sugo
  ["Lasanha de berinjela", ["2a"], "massas-e-risotos"],
  ["Rondeli de frango com catupiry", ["2a"], "massas-e-risotos"],
  ["Risoto de alho-poró", ["2a"], "massas-e-risotos"],
  ["Nhoque recheado de três queijos", ["4a"], "massas-e-risotos"],
  ["Lasanha de presunto e queijo", ["4a", "2b"], "massas-e-risotos"],
  ["Yakissoba de legumes", ["5a", "5b", "5c"], "massas-e-risotos"],
  ["Penne com rúcula, tomate seco e queijo branco", ["5a", "4b"], "massas-e-risotos"], // CONFIRMAR: na 1ª semana o nome vem truncado: «Penne com rúcula "...."»
  ["Espaguete de frango", ["2b"], "massas-e-risotos"],
  ["Lasanha à margarida", ["4b"], "massas-e-risotos"], // CONFIRMAR: no papel vem "lasanha a margarida" — provavelmente à margherita
  ["Panqueca de carne", ["1b", "1c"], "massas-e-risotos"],
  ["Rondeli de peito de peru", ["2c"], "massas-e-risotos"],
  ["Talharim à carbonara", ["5b"], "massas-e-risotos"],
  ["Talharim com camarão", ["3a", "3b", "3c"], "massas-e-risotos"],
  ["Canelone de presunto e queijo", ["3a", "3b", "3c"], "massas-e-risotos"],
  ["Lasanha de peito de peru", ["4c"], "massas-e-risotos"],
  ["Penne à calabresa", ["4c"], "massas-e-risotos"],

  // ── Fritos ────────────────────────────────────────────────────────────
  ["Salgados", ["1a", "2a", "3a", "4a", "5a", "1b", "2b", "3b", "4b", "1c", "2c", "3c", "4c", "5c"], "fritos"],
  ["Batata frita", ["1a", "2a", "3a", "4a", "5a", "2b", "3b", "4b", "5b", "2c", "3c", "4c", "5c"], "fritos"],
  ["Folheado de presunto e queijo", ["1a"], "fritos"],
  ["Pastel de brócolis", ["2a", "1b"], "fritos"],
  ["Mandioca frita", ["2a", "3a", "3b", "5b", "3c", "5c"], "fritos"],
  ["Pastel de siri", ["4b"], "fritos"],
  ["Pastel de queijo", ["3a", "3b", "3c"], "fritos"],

  // ── Outros ────────────────────────────────────────────────────────────
  ["Omelete de queijo branco e peito de peru", ["2a"], "outros"],
  ["Omelete de legumes", ["2b"], "outros"],
];

const PRATOS_HERDADOS = [
  // ── Acompanhamentos ───────────────────────────────────────────────────
  ["Tutu", [1], "acompanhamentos"],
  ["Suflê de palmito", [2], "acompanhamentos"],

  // ── Carnes ────────────────────────────────────────────────────────────
  ["Copa-lombo com abacaxi", [1], "carnes"],
  ["Escalope ao molho madeira", [2], "carnes"],

  // ── Frangos ───────────────────────────────────────────────────────────
  ["Peito assado ao molho fiorentina", [2], "frangos"],
  ["Peito assado com barbecue", [2], "frangos"],

  // ── Peixes e frutos do mar ────────────────────────────────────────────
  ["Peixe à dorê", [2], "peixes-e-frutos-do-mar"],

  // ── Massas e risotos ──────────────────────────────────────────────────
  ["Lasanha de quatro queijos", [2], "massas-e-risotos"],
  ["Quiche de alho-poró", [2], "massas-e-risotos"],
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

  /*
   * ⚠️ **Este laço lia TOKEN como se fosse DIA, e os dois defeitos vieram do
   * mesmo lugar: ele foi escrito quando a segunda posição era `[1, 4]` e não
   * foi revisto quando os tokens de semana chegaram, em 17/09/2026.**
   *
   * · `dias.length === 5` contava TOKENS. Em 21/09 a terceira semana deu cinco
   *   tokens à mandioca frita — `2a, 3b, 5b, 3c, 5c` — e o guarda reprovou a
   *   carga dizendo "use [] em vez de [1,2,3,4,5]". São TRÊS dias (2, 3 e 5).
   *   Falso positivo, e ele apareceu só porque nenhum prato tinha tido cinco
   *   tokens antes;
   * · `d < 1 || d > 5` compara `"2a"` com número. Em JavaScript isso é sempre
   *   falso, então a checagem de faixa **não fazia nada há duas semanas** —
   *   um `"9a"` teria passado direto. Esse é o defeito pior: o outro reclamava
   *   alto, este ficava calado.
   *
   * Agora a conversão é explícita: `diasDe()` transforma token em dia, e é
   * sobre o dia que as duas regras valem. E o FORMATO do token passa a ser
   * verificado — `[1-5][a-c]` —, porque `diasDe` lê só o primeiro caractere e
   * engoliria `"3d"` (uma quarta semana que não existe) sem dizer nada.
   */
  for (const [nome, listas, cat] of TODOS_OS_PRATOS) {
    if (!CATEGORIAS.some(([slug]) => slug === cat)) {
      problemas.push(`${nome}: categoria desconhecida "${cat}"`);
    }

    const malformados = listas.filter((l) => !/^[1-5][a-c]$/.test(l));
    if (malformados.length) {
      problemas.push(`${nome}: token fora do formato [1-5][a-c] (${malformados.join(",")})`);
    }

    const dias = diasDe(listas);
    if (dias.some((d) => d < 1 || d > 5)) {
      problemas.push(`${nome}: dia fora de 1..5 (${dias.join(",")})`);
    }
    /*
     * ⚠️ **A regra "sai todo dia, use []" FOI REMOVIDA em 21/09/2026, e o
     * motivo é que ela pertencia a um significado que a segunda posição já não
     * tem.**
     *
     * Quando ela foi escrita, a segunda posição era uma lista de DIAS: `[1, 4]`.
     * Ali, `[1,2,3,4,5]` e `[]` diziam exatamente a mesma coisa, e preferir o
     * vazio era simplificação legítima.
     *
     * Com os tokens de semana, a segunda posição passou a dizer OUTRA coisa: em
     * QUAIS listas do papel o prato apareceu. Isso é mais informação que o
     * conjunto de dias, e é justamente a informação que a verificação por lista
     * consome. Com a terceira semana, farofa, salgados e batata frita passaram a
     * cobrir os cinco dias — e trocá-los por `[]` teria dois efeitos:
     *
     * · **nenhum** sobre o que vai para o banco: `diasDe` devolve `[1,2,3,4,5]`
     *   nos dois casos, verificado;
     * · **quebrar a conta**: `[]` casa com todas as quinze listas, inclusive a
     *   `4a`, onde o papel da quinta da primeira semana não traz farofa. O total
     *   daquela lista passaria de 18 para 19 e o guarda acusaria a carga por um
     *   prato que o cliente não listou ali.
     *
     * Ou seja: obedecer à regra apagaria a procedência para não ganhar nada. O
     * que sobra deste laço — formato do token e faixa do dia — continua valendo.
     */
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
  console.log(`${TODOS_OS_PRATOS.length} pratos (${PRATOS.length} dos papéis de 17/09 e 21/09 + ${PRATOS_HERDADOS.length} herdados de 03/09), ${CATEGORIAS.length} categorias`);
  console.log(`pratos por lista do cliente  ${porDia}  (conferido contra a lista do cliente)`);

  if (DRY) {
    console.log("\namostra de slug:");
    for (const nome of [
      "Copa-lombo com abacaxi",
      "Feijão",
      "Couve-flor à dorê",
      "Peixe à dorê",
      "Anchova negra à meunière",
    ]) {
      console.log("  ", nome.padEnd(38), "->", slugificar(nome));
    }
    console.log(`\nsairiam ${REMOVIDOS.length} prato(s) do banco:`);
    for (const { slug, motivo } of REMOVIDOS) {
      console.log("  −", slug.padEnd(38), motivo);
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
    /*
     * As saídas vêm DEPOIS das escritas, e a ordem importa: o renomeado precisa
     * existir com o slug novo antes de o velho sumir, senão há um instante em que
     * a aba de quarta não tem peixe nenhum.
     */
    const slugsParaApagar = REMOVIDOS.map((r) => r.slug);
    const achados = await prisma.menuItem.findMany({
      where: { slug: { in: slugsParaApagar } },
      select: { slug: true },
    });
    const presentes = new Set(achados.map((i) => i.slug));
    if (presentes.size) {
      // `deleteMany` devolve CONTAGEM, não linhas — por isso a consulta acima.
      const { count } = await prisma.menuItem.deleteMany({
        where: { slug: { in: [...presentes] } },
      });
      console.log(`\n${count} prato(s) removido(s):`);
      for (const { slug, motivo } of REMOVIDOS) {
        if (presentes.has(slug)) console.log("  −", slug.padEnd(38), motivo);
      }
    }
    const ausentes = slugsParaApagar.filter((s) => !presentes.has(s));
    if (ausentes.length) {
      console.log(`\n${ausentes.length} já não estava(m) no banco: ${ausentes.join(", ")}`);
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
