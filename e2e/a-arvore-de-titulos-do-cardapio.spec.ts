import { expect, test } from "@playwright/test";

/**
 * A árvore de títulos do cardápio reflete o aninhamento de verdade.
 *
 * **O defeito, medido antes de corrigir.** A página emitia **15 títulos de
 * nível 2** na árvore que um leitor de tela percorre, e duas coisas estavam
 * erradas de uma vez:
 *
 * - **O dia não existia na estrutura.** As categorias do buffet daquele dia
 *   apareciam direto sob o `h1` da página. Saltar de título em título — que é o
 *   modo dominante de navegação de leitor de tela — levava a "Carnes" sem dizer
 *   se era a carne de segunda ou de sexta.
 * - **Categoria e seção empatavam.** "Fritos", que é uma prateleira do buffet do
 *   dia, ficava no mesmo nível de "Sobremesas" e "Ilha de massas", que são
 *   seções inteiras do cardápio. A estrutura afirmava que pesam o mesmo.
 *
 * O painel do dia já tinha NOME acessível — `aria-labelledby` aponta para a aba
 * —, e é por isso que o defeito não aparecia numa auditoria de rótulo: quem
 * entra no painel como região ouve "Sexta". Nome e título servem modos de
 * navegação diferentes, e só um dos dois existia.
 *
 * Depois: **8 títulos de nível 2** — o dia, as quatro seções do cardápio e os
 * três do rodapé.
 *
 * ⚠️ **A invariante medida é "não cresce com o conteúdo", e não uma lista de
 * nomes.** Contar títulos esperados por nome envelheceria a cada categoria que
 * o cliente cadastrasse pelo painel, e a guarda passaria a falhar por conteúdo
 * novo em vez de por estrutura quebrada. O que a estrutura promete é outra
 * coisa: dentro do painel do dia existe UM título de nível 2 (o do próprio
 * painel) e todo o resto é mais fundo. Isso vale com seis categorias ou com
 * sessenta.
 */

/** O painel do dia que está no ar; os outros têm `hidden`. */
const PAINEL_ATIVO = '[role="tabpanel"]:not([hidden])';

test("o painel do dia tem um título só, e as categorias ficam abaixo dele", async ({
  page,
}) => {
  await page.goto("/cardapio", { waitUntil: "domcontentloaded" });

  const dentroDoPainel = await page.locator(PAINEL_ATIVO).evaluate((painel) =>
    [...painel.querySelectorAll("h1,h2,h3,h4,h5,h6")]
      .filter((h) => (h as HTMLElement).checkVisibility())
      .map((h) => ({
        nivel: Number(h.tagName[1]),
        texto: (h.textContent ?? "").trim().slice(0, 40),
      })),
  );

  // Sentinela: painel sem título nenhum passaria as asserções abaixo sem
  // examinar estrutura nenhuma — e é o estado de um banco vazio.
  expect(
    dentroDoPainel.length,
    "o painel do dia não tem título nenhum: ou o banco está vazio, ou a página mudou de forma",
  ).toBeGreaterThan(3);

  const deNivel2 = dentroDoPainel.filter((h) => h.nivel === 2);
  expect(
    deNivel2.map((h) => h.texto),
    `O painel do dia tem ${deNivel2.length} títulos de nível 2, e deveria ter ` +
      `exatamente um: o do próprio painel. Cada título a mais é uma categoria do ` +
      `buffet promovida ao nível das SEÇÕES do cardápio (Sobremesas, Ilha de ` +
      `massas) — e aí a estrutura diz que uma prateleira do dia pesa o mesmo que ` +
      `elas. Ver o aviso em src/app/[locale]/(marketing)/cardapio/page.tsx.`,
  ).toHaveLength(1);

  // O título do painel é o primeiro de dentro dele, e nomeia o dia.
  expect(dentroDoPainel[0]!.nivel, "o primeiro título do painel não é o dele").toBe(2);
  expect(
    dentroDoPainel[0]!.texto.toLowerCase(),
    `o título do painel é "${dentroDoPainel[0]!.texto}" e não nomeia um dia da semana`,
  ).toMatch(/segunda|terça|terca|quarta|quinta|sexta/);

  /*
   * E os dois degraus abaixo existem de verdade. Sem isto, achatar tudo em
   * nível 2 e deixar UM título no painel também passaria a asserção de cima.
   */
  const niveis = new Set(dentroDoPainel.map((h) => h.nivel));
  expect(
    [...niveis].sort(),
    "esperava três degraus dentro do painel: o dia, as categorias e os pratos",
  ).toEqual([2, 3, 4]);
});

test("a página tem um h1 e o nível 2 não cresce com o conteúdo", async ({ page }) => {
  await page.goto("/cardapio", { waitUntil: "domcontentloaded" });

  const arvore = await page.evaluate(() =>
    [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")]
      .filter((h) => (h as HTMLElement).checkVisibility())
      .map((h) => ({
        nivel: Number(h.tagName[1]),
        texto: (h.textContent ?? "").trim().slice(0, 40),
      })),
  );

  const h1 = arvore.filter((h) => h.nivel === 1);
  expect(h1.map((h) => h.texto), "a página precisa de exatamente um h1").toHaveLength(1);

  /*
   * O teto inclui o rodapé, que aparece nas sete páginas: o dia, as quatro
   * seções do cardápio (ilha, sobremesas, bebidas, vinhos) e três do rodapé
   * (navegação, contato, redes) — oito. A folga de dois é para uma seção nova
   * do cardápio não exigir mexer no teste; o que ela NÃO cobre é o retorno das
   * categorias, que eram seis num dia e crescem com o cadastro do cliente.
   */
  const deNivel2 = arvore.filter((h) => h.nivel === 2);
  expect(
    deNivel2.map((h) => h.texto),
    `A página tem ${deNivel2.length} títulos de nível 2. Esse número é de ` +
      `ESTRUTURA — o dia, as seções do cardápio e o rodapé — e não pode crescer ` +
      `com o conteúdo. Se ele cresce quando o cliente cadastra categoria, é porque ` +
      `a categoria voltou a ser nível 2.`,
  ).not.toHaveLength(0);
  expect(deNivel2.length).toBeLessThanOrEqual(10);

  // Sentinela do teto: com conteúdo de verdade a página passa de 20 títulos, e
  // um teto de 10 no nível 2 só significa algo se existir conteúdo abaixo dele.
  expect(
    arvore.length,
    "a página tem poucos títulos: o teto de nível 2 passaria sem conteúdo para aninhar",
  ).toBeGreaterThan(20);
});
