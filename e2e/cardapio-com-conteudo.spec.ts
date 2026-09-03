import { expect, test } from "@playwright/test";
import { NOMES, rodaContraLocal } from "./semeia-cardapio";

/**
 * O cardápio no navegador, com pratos de verdade no banco.
 *
 * As abas por dia têm teste unitário — setas, tabulação, painéis. O que nunca
 * foi exercitado no navegador é a página COM CONTEÚDO, e é aí que mora a classe
 * de defeito que mais apareceu nesta semana: os dois saltos de nível de título
 * (o índice de novidades e este cardápio) só ficaram visíveis quando havia
 * registro no banco. Com o banco vazio, a página não desenha grade nenhuma e a
 * suíte passa sem exercitar nada.
 *
 * A semeadura e a limpeza vivem em `e2e/semeia-cardapio.ts`, ligadas ao
 * `globalSetup`/`globalTeardown` — e não num `beforeAll` daqui. A ordem é o
 * ponto: no CI o `webServer` faz `npm run build`, que PRÉ-RENDERIZA a página.
 * Semear dentro do teste chegaria tarde demais, e a suíte exercitaria um estado
 * vazio achando que exercitava conteúdo.
 *
 * ⚠️ **Isto ESCREVE no banco**, então só roda contra servidor local. A
 * verificação é código, não comentário: apontar a suíte para o site publicado e
 * semear cardápio escreveria no Supabase de produção.
 *
 * ⚠️ **As fixtures convivem com o cardápio real desde 03/09.** Localmente o
 * banco tem 82 pratos de verdade; no CI, nenhum. Por isso os nomes semeados
 * dizem o PAPEL da fixture e não um prato — ver a explicação em
 * `semeia-cardapio.ts`. Buscar por nome de comida aqui voltaria a colidir na
 * primeira vez que o restaurante servisse aquele prato.
 */
test.describe.configure({ mode: "serial" });

test.skip(
  !rodaContraLocal,
  "este spec escreve no banco: só roda contra servidor local, nunca contra o site publicado",
);

/**
 * A mensagem do caso que mais confunde quem depura: o servidor já estava de pé
 * quando a semeadura rodou, então as consultas do cardápio servem a versão
 * anterior de `unstable_cache` — semear pelo Prisma não invalida a etiqueta
 * como uma edição pelo painel invalidaria.
 *
 * ⚠️ Este diagnóstico **olhava para a existência de abas**, e parou de
 * funcionar em 03/09. Com o banco vazio, cache velho significava zero abas e a
 * checagem acertava. Com 82 pratos reais, há abas de qualquer jeito: o cache
 * velho passou a se manifestar apenas na ausência das FIXTURES, e o teste
 * falhava com "elemento não encontrado" — que manda quem lê para o lugar
 * errado. Agora ele pergunta pela fixture, que é o que o cache esconde.
 */
const DICA_DE_CACHE =
  "O prato semeado não apareceu. Se o servidor já estava rodando antes da " +
  "semeadura, ele está servindo o cardápio anterior do cache: reinicie-o. " +
  "(O `globalSetup` semeia antes do servidor subir, e é assim que o CI roda.)";

test("a página mostra o cardápio, agrupado por categoria", async ({ page }) => {
  await page.goto("/cardapio", { waitUntil: "networkidle" });

  await expect(page.getByRole("tablist")).toBeVisible();

  // Diagnóstico antes da asserção: a causa quase certa de a fixture sumir é
  // cache velho, e a mensagem padrão não diz isso.
  const permanente = page.getByRole("tabpanel").getByText(NOMES.permanente);
  expect(await permanente.count(), DICA_DE_CACHE).toBeGreaterThan(0);
  await expect(permanente).toBeVisible();
});

test("não pula nível de título com conteúdo na tela", async ({ page }) => {
  /*
   * A guarda que faltava. Com o banco vazio a página não tem categoria nem
   * prato, e o teste de níveis da suíte geral passa sobre um `h1` sozinho.
   * Foi assim que o salto h1 → h3 daqui passou despercebido até eu semear
   * dados à mão em 01/09.
   */
  await page.goto("/cardapio", { waitUntil: "networkidle" });
  const saltos = await page.evaluate(() => {
    const niveis = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
      nivel: Number(h.tagName[1]),
      texto: (h.textContent ?? "").trim().slice(0, 30),
    }));
    const achados: string[] = [];
    for (let i = 1; i < niveis.length; i++) {
      if (niveis[i]!.nivel - niveis[i - 1]!.nivel > 1) {
        achados.push(`h${niveis[i - 1]!.nivel} ("${niveis[i - 1]!.texto}") → h${niveis[i]!.nivel} ("${niveis[i]!.texto}")`);
      }
    }
    return achados;
  });
  expect(saltos, saltos.join(" | ")).toEqual([]);
});

test("a aba escolhida troca os pratos do dia", async ({ page }) => {
  await page.goto("/cardapio", { waitUntil: "networkidle" });

  const painel = page.getByRole("tabpanel");
  await page.getByRole("tab").nth(0).click(); // segunda
  await expect(painel.getByText(NOMES.segundaEQuinta)).toBeVisible();
  await expect(painel.getByText(NOMES.sexta)).toBeHidden();

  await page.getByRole("tab").nth(4).click(); // sexta
  await expect(painel.getByText(NOMES.sexta)).toBeVisible();
  await expect(painel.getByText(NOMES.segundaEQuinta)).toBeHidden();

  // E o permanente segue nas duas.
  await expect(painel.getByText(NOMES.permanente)).toBeVisible();
});

test("as setas do teclado andam entre as abas, no navegador de verdade", async ({ page }) => {
  // O teste unitário já cobre isto, mas o padrão de abas vive de como o
  // navegador trata `tabindex` e foco — coisas que o jsdom simula.
  await page.goto("/cardapio", { waitUntil: "networkidle" });

  await page.getByRole("tab").nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab").nth(1)).toBeFocused();
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute("aria-selected", "true");
});

test("a massa da ilha aparece em seção própria, fora das abas", async ({ page }) => {
  // Preço diferente, seção diferente. Se ela aparecesse dentro de uma aba de
  // dia, quem lê na mesa concluiria que entra no preço do buffet.
  await page.goto("/cardapio", { waitUntil: "networkidle" });
  const massas = page.locator("#massas");
  await expect(massas).toBeVisible();
  await expect(massas.getByText(NOMES.massa)).toBeVisible();
  await expect(page.getByRole("tabpanel").getByText(NOMES.massa)).toBeHidden();
});
