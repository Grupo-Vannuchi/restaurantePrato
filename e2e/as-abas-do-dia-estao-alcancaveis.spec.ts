import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

/**
 * As abas de dia do cardápio são alcançáveis: a ativa aparece, e o anel de foco
 * não é cortado.
 *
 * ── Defeito 1: a aba selecionada nascia fora da tela ─────────────────────
 *
 * No celular as cinco abas não cabem lado a lado, então a faixa rola na
 * horizontal — e ela começa no zero, na segunda-feira. Numa sexta, a aba de
 * HOJE, que é a que o cardápio abre selecionada, ficava em 398 px numa faixa de
 * 404: **seis pixels dela na tela**. Quem chegava via segunda, terça e quarta,
 * nenhuma delas marcada, e o painel de baixo mostrando um dia que não estava à
 * vista. No desktop a faixa quebra em linhas (`sm:flex-wrap`) e o defeito não
 * existe — é só na largura em que a maioria chega.
 *
 * ── Defeito 2: o anel de foco cortado pela própria faixa ─────────────────
 *
 * `overflow-x: auto` faz o eixo vertical computar `auto` também — a regra do CSS
 * é que `visible` num eixo vira `auto` quando o outro não é `visible` —, então a
 * caixa recorta em cima e embaixo. O anel de `globals.css` é 2 px de traço com
 * 2 px de deslocamento, quatro para fora do botão, e o recuo de topo da faixa
 * era ZERO: quem percorre as abas por teclado via o anel cortado ao meio.
 *
 * ⚠️ **A segunda verificação é geométrica, e não visual, de propósito.** O anel
 * só é pintado sob `:focus-visible`, que distingue foco de teclado de foco por
 * script — e `locator.focus()` do Playwright conta como script. Em vez de
 * inventar um caminho de Tab até a aba, a guarda compara DOIS NÚMEROS que
 * precisam concordar: o tamanho do anel, lido de `globals.css`, e o recuo da
 * faixa, lido do estilo computado. Se alguém engrossar o anel, ela falha
 * apontando o rolador — que é o acoplamento que importa e que ninguém lembraria.
 *
 * E ela varre TODO rolador horizontal com coisa focável dentro, não só as abas:
 * o carrossel da ilha de massas é outro, e o próximo que alguém criar já nasce
 * coberto.
 */

/** O anel de foco declarado no CSS global: quanto ele avança para fora. */
const ANEL = (() => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const traco = /outline:\s*(\d+)px\s+solid/.exec(css);
  const desloc = /outline-offset:\s*(\d+)px/.exec(css);
  if (!traco || !desloc) {
    throw new Error("anel de foco não encontrado em globals.css — a guarda não tem o que comparar");
  }
  return Number(traco[1]) + Number(desloc[1]);
})();

test("a aba do dia selecionado aparece na faixa", async ({ page }) => {
  await page.goto("/cardapio", { waitUntil: "networkidle" });

  const m = await page.evaluate(() => {
    const lista = document.querySelector('[role="tablist"]') as HTMLElement | null;
    if (!lista) return null;
    const ativa = lista.querySelector('[aria-selected="true"]') as HTMLElement | null;
    if (!ativa) return null;
    const f = lista.getBoundingClientRect();
    const a = ativa.getBoundingClientRect();
    return {
      abas: lista.querySelectorAll('[role="tab"]').length,
      rola: lista.scrollWidth > lista.clientWidth,
      dia: (ativa.textContent ?? "").trim().slice(0, 12),
      recorte: {
        esquerda: Math.round(a.left - f.left),
        direita: Math.round(a.right - f.right),
        faixa: Math.round(f.width),
      },
    };
  });

  // Sentinelas: sem faixa, sem aba marcada ou com menos de cinco dias, o resto
  // da verificação não examina o que ela diz examinar.
  expect(m, "faixa de abas ou aba selecionada não encontrada em /cardapio").not.toBeNull();
  expect(m!.abas, "esperava os cinco dias úteis na faixa").toBe(5);

  expect(
    m!.recorte.esquerda,
    `a aba "${m!.dia}" começa ${-m!.recorte.esquerda}px ANTES da borda esquerda da ` +
      `faixa (largura ${m!.recorte.faixa}px, rolável: ${m!.rola}). O rolador precisa ` +
      `trazer a aba ativa para dentro — ver o efeito em ` +
      `src/components/cardapio/day-tabs.tsx.`,
  ).toBeGreaterThanOrEqual(-1);

  expect(
    m!.recorte.direita,
    `a aba "${m!.dia}" termina ${m!.recorte.direita}px DEPOIS da borda direita da ` +
      `faixa (largura ${m!.recorte.faixa}px, rolável: ${m!.rola}). Era o estado de ` +
      `sexta-feira no celular: seis pixels da aba de hoje na tela.`,
  ).toBeLessThanOrEqual(1);
});

test("nenhum rolador horizontal corta o anel de foco", async ({ page }) => {
  await page.goto("/cardapio", { waitUntil: "networkidle" });

  const apertados = await page.evaluate((anel) => {
    const problemas: string[] = [];
    let examinados = 0;

    for (const el of Array.from(document.querySelectorAll("*"))) {
      const s = getComputedStyle(el);
      const rolaNoX = s.overflowX === "auto" || s.overflowX === "scroll";
      if (!rolaNoX) continue;
      // Só importa onde existe algo que possa receber foco: sem foco, não há
      // anel para cortar.
      const focavel = el.querySelector(
        "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])",
      );
      if (!focavel) continue;
      // `visible` no eixo Y significa que nada é recortado ali.
      if (s.overflowY === "visible") continue;

      examinados++;
      const cima = parseFloat(s.paddingTop);
      const baixo = parseFloat(s.paddingBottom);
      if (cima < anel || baixo < anel) {
        const classe = String((el as HTMLElement).className || "").split(" ").slice(0, 3).join(".");
        problemas.push(
          `${el.tagName.toLowerCase()}${classe ? `.${classe}` : ""} tem recuo ` +
            `${cima}px/${baixo}px (cima/baixo) e o anel de foco avança ${anel}px`,
        );
      }
    }
    return { problemas, examinados };
  }, ANEL);

  // Sentinela: a faixa de abas é um rolador com botões dentro. Se a varredura
  // não achar nenhum, ela não está examinando nada.
  expect(
    apertados.examinados,
    "nenhum rolador horizontal com elemento focável encontrado em /cardapio",
  ).toBeGreaterThan(0);

  expect(
    apertados.problemas,
    `Rolador que corta o anel de foco:\n  ${apertados.problemas.join("\n  ")}\n` +
      `\`overflow-x: auto\` faz o eixo Y computar \`auto\` também, então a caixa ` +
      `recorta em cima e embaixo. Dê a ela recuo vertical de pelo menos ${ANEL}px e ` +
      `devolva o espaço com margem negativa, para a página não mudar de altura.`,
  ).toEqual([]);
});
