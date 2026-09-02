import { expect, test } from "@playwright/test";
import { rodaContraLocal } from "./semeia-cardapio";

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
 * ⚠️ **Localmente, com um servidor já quente, os dados podem não aparecer.** As
 * consultas do cardápio passam por `unstable_cache`, e semear pelo Prisma não
 * invalida a etiqueta como uma edição pelo painel invalidaria. Foi assim que a
 * primeira execução deste spec falhou. O primeiro teste abaixo reconhece esse
 * caso e diz o que fazer, em vez de acusar "elemento não encontrado".
 */
test.describe.configure({ mode: "serial" });

test.skip(
  !rodaContraLocal,
  "este spec escreve no banco: só roda contra servidor local, nunca contra o site publicado",
);

test("a página mostra o cardápio, agrupado por categoria", async ({ page }) => {
  await page.goto("/cardapio", { waitUntil: "networkidle" });

  // Diagnóstico antes da asserção: sem abas, a causa quase certa é cache velho,
  // e "elemento não encontrado" manda quem for depurar para o lugar errado.
  const temAbas = (await page.getByRole("tablist").count()) > 0;
  expect(
    temAbas,
    "A página veio sem abas. Se o servidor já estava rodando antes da semeadura, " +
      "ele está servindo o cardápio vazio do cache: reinicie-o (o `globalSetup` " +
      "semeia antes do servidor subir, e é assim que o CI roda).",
  ).toBe(true);

  await expect(page.getByRole("tablist")).toBeVisible();
  // O prato permanente aparece em qualquer aba que esteja aberta.
  await expect(page.getByRole("tabpanel").getByText("Arroz branco")).toBeVisible();
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
  await expect(painel.getByText("Assado de panela")).toBeVisible();
  await expect(painel.getByText("Peixe grelhado")).toBeHidden();

  await page.getByRole("tab").nth(4).click(); // sexta
  await expect(painel.getByText("Peixe grelhado")).toBeVisible();
  await expect(painel.getByText("Assado de panela")).toBeHidden();

  // E o permanente segue nas duas.
  await expect(painel.getByText("Arroz branco")).toBeVisible();
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

test("a ilha de massas aparece em seção própria, fora das abas", async ({ page }) => {
  // Preço diferente, seção diferente. Se o talharim aparecesse dentro de uma
  // aba de dia, quem lê na mesa concluiria que ele entra no preço do buffet.
  await page.goto("/cardapio", { waitUntil: "networkidle" });
  const massas = page.locator("#massas");
  await expect(massas).toBeVisible();
  await expect(massas.getByText("Talharim")).toBeVisible();
  await expect(page.getByRole("tabpanel").getByText("Talharim")).toBeHidden();
});
