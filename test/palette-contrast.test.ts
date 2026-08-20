import { describe, expect, it } from "vitest";

import { siteConfig, type ThemePalette } from "@/config/site";

/**
 * Contraste da paleta, nos dois temas.
 *
 * A paleta de hoje é **herdada** do projeto do qual este repo é fork, e sai no
 * PR 2 — as cores do Restaurante Prato ainda não chegaram. Medir as cores
 * atuais, portanto, tem prazo de validade; a *verificação* não tem. Quando a
 * paleta nova entrar, este teste passa ou nomeia exatamente o par que reprovou,
 * em vez de alguém precisar lembrar de rodar um script.
 *
 * Existe `docs/superpowers/specs/2026-08-07-palette-contrast.mjs`, que fez esse
 * papel uma vez, na mão, com as cores escritas dentro dele. Este lê as cores de
 * `siteConfig`, que é a fonte da verdade.
 *
 * Os limites são os da WCAG 2.1:
 *
 * - **4,5:1** para texto normal (nível AA). É o que separa "legível" de
 *   "legível para quem tem visão perfeita, numa tela boa, sem sol na tela".
 * - **3:1** para elemento gráfico e borda de componente.
 *
 * O `accent` fica de fora do limite de texto de propósito: no projeto ele é
 * cor de gráfico e de detalhe de interface, **nunca** de texto — e o comentário
 * ao lado dele em `site.ts` já dizia isso antes deste teste existir.
 */

/** Luminância relativa, conforme a fórmula da WCAG. */
function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = canais.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

/** Razão de contraste entre duas cores, de 1:1 (igual) a 21:1 (preto/branco). */
function contraste(a: string, b: string): number {
  const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (maior! + 0.05) / (menor! + 0.05);
}

const TEMAS: [string, ThemePalette][] = [
  ["claro", siteConfig.theme.light],
  ["escuro", siteConfig.theme.dark],
];

describe.each(TEMAS)("tema %s", (_nome, paleta) => {
  it("o texto da página é legível sobre o fundo", () => {
    const razao = contraste(paleta.foreground, paleta.background);
    expect(razao, `${razao.toFixed(2)}:1 — mínimo 4.5:1`).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("o texto do botão é legível sobre a cor da marca", () => {
    // O botão principal do site inteiro. Foi aqui que a paleta anterior falhou
    // — a cor pura da marca sobre o creme dava 2,14:1, menos da metade do
    // mínimo — e a solução foi escurecer a marca só no tema claro.
    const razao = contraste(paleta.brandForeground, paleta.brand);
    expect(razao, `${razao.toFixed(2)}:1 — mínimo 4.5:1`).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("a cor da marca se distingue do fundo como elemento gráfico", () => {
    const razao = contraste(paleta.brand, paleta.background);
    expect(razao, `${razao.toFixed(2)}:1 — mínimo 3:1`).toBeGreaterThanOrEqual(3);
  });

  it("o acento se distingue do fundo como elemento gráfico", () => {
    const razao = contraste(paleta.accent, paleta.background);
    expect(razao, `${razao.toFixed(2)}:1 — mínimo 3:1`).toBeGreaterThanOrEqual(3);
  });
});
