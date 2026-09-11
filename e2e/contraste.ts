import type { Locator, Page } from "@playwright/test";

/**
 * Medir contraste do que a TELA mostra, e não do que o CSS declara.
 *
 * Este módulo existe porque a fórmula da WCAG estava escrita duas vezes em dois
 * specs. Duas cópias da mesma conta divergem — e quando divergem, uma das duas
 * guardas passa a dizer um número que ninguém conferiu.
 *
 * ⚠️ **A diferença entre isto e `test/palette-contrast.test.ts` é a razão de os
 * dois existirem.** Aquele compara pares de cor DECLARADOS no código, e nenhum
 * par declarado muda quando entra uma fotografia escura atrás do texto, ou
 * quando uma cor translúcida se mistura com a superfície de baixo. Foi assim que
 * o subtítulo do topo da home chegou a 1,20:1 com o teste de paleta verde, e é
 * assim que um selo `bg-brand/10` com texto `text-brand` fica em 4,24:1: os dois
 * tokens são legítimos, a mistura dos dois não.
 */

/** Luminância relativa da WCAG. */
export function luminancia(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contraste(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Lê a luminância da cor de texto computada de um elemento. */
export async function luminanciaDoTexto(alvo: Locator): Promise<number> {
  const cor = await alvo.evaluate((e) => getComputedStyle(e).color);
  const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(cor);
  if (!rgb) throw new Error(`cor de texto ilegível: ${cor}`);
  return luminancia(Number(rgb[1]), Number(rgb[2]), Number(rgb[3]));
}

/**
 * Decodifica um PNG no canvas do PRÓPRIO navegador e devolve os pixels.
 * Evita depender de um decodificador de PNG no processo de teste.
 */
export async function pixels(page: Page, png: Buffer): Promise<number[]> {
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return Array.from(c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data);
  }, png.toString("base64"));
}

/** O pior contraste entre a cor do texto e cada pixel de um retângulo de fundo. */
export function piorContraste(lTexto: number, dados: number[]): number {
  let pior = Number.POSITIVE_INFINITY;
  for (let i = 0; i < dados.length; i += 4) {
    const c = contraste(lTexto, luminancia(dados[i]!, dados[i + 1]!, dados[i + 2]!));
    if (c < pior) pior = c;
  }
  return pior;
}

/**
 * Mede o pior contraste do texto de um elemento contra o fundo composto que
 * aparece atrás dele.
 *
 * ⚠️ **`modo` não é preferência: os dois casos exigem truques diferentes.**
 *
 * - `"esconde-o-texto"` usa `visibility: hidden`, que PRESERVA o espaço, e
 *   fotografa o retângulo que o texto ocupava. É o certo quando o fundo é
 *   pintado por outro elemento — um véu, uma foto, a seção de baixo.
 * - `"apaga-a-tinta"` torna a cor do texto transparente e mantém o elemento
 *   visível. É o certo quando o PRÓPRIO elemento pinta o fundo: esconder um selo
 *   com `visibility` levaria o fundo dele embora junto, e a medição sairia
 *   contra a superfície de trás, que não é onde o texto está.
 *
 * O pior pixel governa. Um texto legível em 95% da largura e ilegível numa
 * palavra ainda é um texto ilegível.
 */
export async function contrasteNaTela(
  page: Page,
  alvo: Locator,
  modo: "esconde-o-texto" | "apaga-a-tinta" = "esconde-o-texto",
  recorte: "a-caixa-do-elemento" | "so-onde-ha-letra" = "a-caixa-do-elemento",
): Promise<{ pior: number; largura: number; altura: number }> {
  /*
   * ⚠️ **Rolar PRIMEIRO, medir depois.** `page.screenshot({ clip })` recorta em
   * coordenadas de janela, então um elemento abaixo da dobra — as abas de dia
   * são — devolve "clipped area is either empty or outside the resulting image".
   * E a caixa tem de ser lida DEPOIS da rolagem, ou o recorte aponta para onde
   * o elemento estava antes.
   */
  await alvo.scrollIntoViewIfNeeded();

  /*
   * ⚠️ **`so-onde-ha-letra` existe por um falso positivo que custou uma rodada.**
   *
   * A caixa de um elemento `rounded-full` inclui os cantos, e no canto aparece o
   * que está ATRÁS dele. Medindo a caixa inteira de um selo verde com texto
   * verde-claro, os pixels do canto — que são a aba, não o fundo do selo — deram
   * 1,00:1 e a guarda acusou um defeito que não existe: ali não há letra nenhuma.
   *
   * O recorte por `Range` pega o retângulo dos GLIFOS, que é onde a pergunta
   * "este texto se lê?" tem sentido. Fica opcional porque para um bloco de texto
   * grande sobre foto os dois recortes dão o mesmo número, e as medidas
   * registradas nos specs que já existem foram tiradas pela caixa do elemento.
   */
  const caixa =
    recorte === "so-onde-ha-letra"
      ? await alvo.evaluate((e) => {
          const r = document.createRange();
          r.selectNodeContents(e);
          const b = r.getBoundingClientRect();
          return { x: b.x, y: b.y, width: b.width, height: b.height };
        })
      : await alvo.boundingBox();
  if (!caixa) throw new Error("elemento sem caixa para medir");

  const lTexto = await luminanciaDoTexto(alvo);

  /*
   * ⚠️ **Devolve o que mexeu, e isso é correção de um defeito real desta
   * função.** Ela apagava a tinta e ia embora deixando o `style.color` inline
   * no elemento. Numa segunda medição do MESMO elemento — que é o caso quando
   * um selo tem dois estados — `luminanciaDoTexto` lia `rgba(0, 0, 0, 0)`, a
   * expressão pegava os três zeros e a conta saía contra PRETO: um selo branco
   * sobre verde, que mede 4,98:1, apareceu como 4,21:1. O número era plausível
   * o suficiente para eu procurar o erro no componente, não no medidor.
   */
  const antes = await alvo.evaluate(
    (e, m) => {
      const el = e as HTMLElement;
      const anterior = m === "apaga-a-tinta" ? el.style.color : el.style.visibility;
      if (m === "apaga-a-tinta") el.style.color = "transparent";
      else el.style.visibility = "hidden";
      return anterior;
    },
    modo,
  );

  const fundo = await page.screenshot({ clip: caixa });

  await alvo.evaluate(
    (e, { m, anterior }) => {
      const el = e as HTMLElement;
      if (m === "apaga-a-tinta") el.style.color = anterior;
      else el.style.visibility = anterior;
    },
    { m: modo, anterior: antes },
  );

  const pior = piorContraste(lTexto, await pixels(page, fundo));

  return { pior, largura: caixa.width, altura: caixa.height };
}
