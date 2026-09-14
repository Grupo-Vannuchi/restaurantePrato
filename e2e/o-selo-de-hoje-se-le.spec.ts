import { expect, test } from "@playwright/test";

import { contrasteNaTela } from "./contraste";

/**
 * O selo "Hoje" na aba do dia se lê nos DOIS estados da aba.
 *
 * **O defeito.** O selo era translúcido nas duas posições, e translúcido sobre
 * uma superfície da mesma família de cor não dá contraste nenhum:
 *
 * - aba **não** selecionada: `bg-brand/10` com `text-brand` — verde a 10% sobre
 *   o cartão quase branco, com texto do mesmo verde por cima: **4,24:1**
 * - aba **selecionada**: `bg-background/20` herdando `text-brand-foreground` —
 *   branco a 20% sobre o verde da aba, com texto branco por cima: **3,38:1**
 *
 * Os dois abaixo dos 4,5:1 da WCAG AA para texto pequeno, e o selo é `text-[10px]`.
 * `test/palette-contrast.test.ts` seguia verde porque os dois tokens são
 * legítimos — o que falha é a MISTURA deles, que não existe declarada em lugar
 * nenhum. É a mesma classe de defeito do véu do topo da home.
 *
 * A correção troca os translúcidos por par sólido, invertido entre os estados:
 * na aba selecionada o selo é branco com texto verde, na não selecionada é verde
 * com texto branco. Os dois dão 4,98:1 — e são exatamente os pares que
 * `palette-contrast` já vigia, então mexer no verde da marca acusa nos dois
 * testes em vez de num só.
 *
 * ⚠️ **`apaga-a-tinta`, e não `esconde-o-texto`.** Aqui o fundo é pintado pelo
 * PRÓPRIO selo: esconder o elemento com `visibility` levaria o fundo dele junto,
 * e a medição sairia contra a aba de trás — que é uma cor diferente da que o
 * texto tem atrás de si. O modo certo apaga só a tinta das letras.
 *
 * ⚠️ **E o recorte é `so-onde-ha-letra`.** O selo é `rounded-full`: a caixa dele
 * inclui os cantos, e no canto aparece a aba que está atrás. Medindo a caixa
 * inteira, um selo verde com texto claro dava 1,00:1 nos pixels do canto — onde
 * não existe letra — e a guarda acusava um defeito inventado. Levei uma rodada
 * inteira achando que a correção não tinha funcionado.
 *
 * ⚠️ **Fim de semana pula, e pula falando.** O selo só existe quando o
 * restaurante abre: `today` chega `null` no sábado e no domingo e o `<span>` não
 * é renderizado. Um teste que "passasse" nesses dias seria um teste que não
 * examinou nada. Ele é acompanhado de `test/o-selo-de-hoje-e-solido.test.tsx`,
 * que renderiza os dois estados com `today` fixo e roda todo dia — um cobre o
 * pixel, o outro cobre a classe.
 */
const MINIMO_AA = 4.5;

/** A aba de hoje é a única que traz um `<span>` dentro: o selo. */
const ABA_DE_HOJE = '[role="tab"]:has(span)';

test.describe("o selo de hoje", () => {
  test("se lê com a aba de hoje selecionada e sem ela", async ({ page }) => {
    await page.goto("/cardapio", { waitUntil: "load" });

    const abaDeHoje = page.locator(ABA_DE_HOJE);
    const existe = (await abaDeHoje.count()) > 0;
    test.skip(
      !existe,
      "o selo 'Hoje' não é renderizado no fim de semana, quando a casa não abre — " +
        "a classe fica coberta por test/o-selo-de-hoje-e-solido.test.tsx",
    );

    // Sentinela: mais de uma aba com selo significa que o seletor pegou outra
    // coisa, e a medição seria de um elemento qualquer.
    expect(await abaDeHoje.count(), "há mais de uma aba marcada como hoje").toBe(1);
    await expect(abaDeHoje).toHaveAttribute("aria-selected", "true");

    const selo = abaDeHoje.locator("span").first();
    await expect(selo).toHaveText(/hoje/i);

    const selecionado = await contrasteNaTela(page, selo, "apaga-a-tinta", "so-onde-ha-letra");
    // Sentinela: um selo de 0 px passaria a varredura sem examinar pixel nenhum.
    expect(selecionado.largura, "o selo não tem largura").toBeGreaterThan(20);
    expect(selecionado.altura, "o selo não tem altura").toBeGreaterThan(5);

    expect(
      selecionado.pior,
      `Com a aba de hoje SELECIONADA, o selo tem ${selecionado.pior.toFixed(2)}:1 no pior ` +
        `pixel, abaixo dos ${MINIMO_AA}:1 da WCAG AA. Causa provável: o selo voltou a ser ` +
        `translúcido em src/components/cardapio/day-tabs.tsx — branco a 20% sobre o verde ` +
        `da aba, com texto branco por cima, dá 3,38:1. O par sólido (fundo claro, texto ` +
        `da marca) dá 4,98:1.`,
    ).toBeGreaterThanOrEqual(MINIMO_AA);

    /*
     * Agora o outro estado. Clicar em qualquer OUTRO dia deixa a aba de hoje
     * sem seleção, e o selo continua nela — é esse o segundo par de cores.
     * A aba escolhida é a primeira que não é a de hoje, para o teste funcionar
     * em qualquer dia útil, inclusive na segunda.
     */
    const outroDia = page.locator(`[role="tab"]:not(${ABA_DE_HOJE})`).first();
    await outroDia.click();
    await expect(abaDeHoje).toHaveAttribute("aria-selected", "false");

    const semSelecao = await contrasteNaTela(page, selo, "apaga-a-tinta", "so-onde-ha-letra");
    expect(semSelecao.largura, "o selo não tem largura").toBeGreaterThan(20);
    expect(semSelecao.altura, "o selo não tem altura").toBeGreaterThan(5);

    expect(
      semSelecao.pior,
      `Com a aba de hoje SEM seleção, o selo tem ${semSelecao.pior.toFixed(2)}:1 no pior ` +
        `pixel, abaixo dos ${MINIMO_AA}:1 da WCAG AA. Causa provável: o selo voltou a ser ` +
        `translúcido em src/components/cardapio/day-tabs.tsx — verde a 10% sobre o cartão, ` +
        `com texto do mesmo verde por cima, dá 4,24:1. O par sólido (fundo da marca, texto ` +
        `claro) dá 4,98:1.`,
    ).toBeGreaterThanOrEqual(MINIMO_AA);
  });
});
