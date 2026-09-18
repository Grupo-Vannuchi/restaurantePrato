import { describe, expect, it } from "vitest";

import { BORDA, CENTRO, MEIO } from "@/components/cardapio/menu-backdrop";
import { siteConfig } from "@/config/site";

/**
 * O fundo do cardápio e o texto que cai solto sobre ele não podem divergir.
 *
 * ⚠️ **Esta guarda existe porque o tom do fundo já mudou duas vezes num dia.**
 * Em 18/09/2026 `/cardapio` ganhou um fundo verde escuro; o cliente disse que
 * ficou verde demais e pediu algo mais natural, e ele virou um banho de papel
 * quente. Na versão escura, título e subtítulo precisavam de cor clara própria;
 * na clara, voltaram aos tokens do tema.
 *
 * É esse vai e vem que cria o risco: mexer no tom do fundo é uma linha de
 * trabalho, e o texto degradando junto é **silencioso** — a página continua
 * desenhando, o build passa, e quem lê perde o subtítulo. A varredura de
 * contraste pega isso no pixel, mas ela precisa de build e servidor no ar; esta
 * conta roda em milissegundos, em toda execução da suíte.
 *
 * ⚠️ **As duas se completam, não se substituem.** Aqui se confere o par
 * DECLARADO, com a aritmética da WCAG; lá se confere o que o navegador PINTOU,
 * incluindo a mistura de borda, a foto por baixo e a sombra do botão flutuante.
 */

/** Mínimo da WCAG 1.4.3 para texto normal. */
const MINIMO = 4.5;

/** Luminância relativa, pela fórmula da WCAG. */
function luminancia(hex: string): number {
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = canal(parseInt(hex.slice(1, 3), 16));
  const g = canal(parseInt(hex.slice(3, 5), 16));
  const b = canal(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * O tom que governa. Para texto ESCURO o pior caso é o fundo mais escuro, e
 * hoje isso é `BORDA` — mas não está escrito à mão: é calculado, para continuar
 * certo se alguém invertir o degradê.
 */
const PIOR_FUNDO = [CENTRO, MEIO, BORDA].reduce((pior, tom) =>
  luminancia(tom) < luminancia(pior) ? tom : pior,
);

/**
 * As cores que o texto solto usa hoje. `foreground` vem de `siteConfig`;
 * `muted-foreground` é derivado no tema e não vive lá, então entra como o valor
 * que `globals.css` emite — lido do estilo computado em 18/09.
 */
const MUTED_FOREGROUND = "#565c4e";

describe("o fundo do cardápio", () => {
  it("é um banho claro, e não um fundo escuro", () => {
    /*
     * Sentinela de direção. As duas asserções abaixo cobram texto ESCURO
     * legível; se alguém escurecer o fundo de novo, elas falham — mas com uma
     * mensagem sobre contraste, que manda clarear o texto. Esta falha primeiro e
     * diz a verdade: a decisão de cor de texto depende de qual lado o fundo está.
     */
    expect(
      luminancia(PIOR_FUNDO),
      "o fundo do cardápio ficou escuro. O texto solto sobre ele usa os tokens " +
        "do tema, que são ESCUROS — escurecer o fundo exige trocar título e " +
        "subtítulo por cores claras próprias, como fez a versão verde de 18/09, " +
        "e não só ajustar o tom.",
    ).toBeGreaterThan(0.35);
  });

  it("deixa o título legível", () => {
    const { foreground } = siteConfig.theme;
    expect(
      contraste(foreground, PIOR_FUNDO),
      `título (${foreground}) sobre o tom mais escuro do fundo (${PIOR_FUNDO})`,
    ).toBeGreaterThanOrEqual(MINIMO);
  });

  it("deixa o subtítulo legível, que é a folga mais fina", () => {
    // 4,74:1 em 18/09 — passa, mas é o número que cede primeiro se o fundo
    // escurecer um degrau. É esta asserção que segura a decisão de tom.
    expect(
      contraste(MUTED_FOREGROUND, PIOR_FUNDO),
      `subtítulo (${MUTED_FOREGROUND}) sobre o tom mais escuro do fundo ` +
        `(${PIOR_FUNDO}). É a menor folga da página: se ela cair, o tom do ` +
        `fundo tem de voltar a clarear ou o subtítulo precisa de cor própria.`,
    ).toBeGreaterThanOrEqual(MINIMO);
  });

  it("recusa `brand` como cor de texto solto sobre ele", () => {
    /*
     * ⚠️ Não é um alerta teórico: `brand` mede 3,41:1 sobre o tom mais escuro,
     * e ele É a cor dos preços da página. Os preços passam porque vivem DENTRO
     * de `bg-card` (4,80:1 lá) — e é justamente por isso que a regra precisa
     * estar escrita: mover um preço para fora do cartão o torna ilegível sem
     * mudar uma linha de cor.
     */
    const { brand } = siteConfig.theme;
    expect(
      contraste(brand, PIOR_FUNDO),
      "se `brand` passou a ter contraste suficiente sobre o fundo, esta guarda " +
        "está desatualizada — mas confira antes se não foi o fundo que clareou " +
        "demais e apagou o empilhamento dos cartões.",
    ).toBeLessThan(MINIMO);
  });
});
