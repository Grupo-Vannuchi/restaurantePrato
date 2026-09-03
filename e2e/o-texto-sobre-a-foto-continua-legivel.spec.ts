import { expect, test } from "@playwright/test";

/**
 * O texto do topo continua legível sobre o que estiver atrás dele.
 *
 * O topo da home põe título e subtítulo sobre uma fotografia, com um véu que é
 * opaco à esquerda e enfraquece para a direita. Enquanto não havia foto, o fundo
 * era um degradê da marca e o contraste era o dos tokens, coberto por
 * `test/palette-contrast.test.ts`. A primeira foto entrou em 03/09.
 *
 * ⚠️ **O que esta guarda protege NÃO é a escolha da foto.** Escrevi isso
 * primeiro e estava errado. Medindo, a imagem tem efeito ZERO na faixa onde o
 * subtítulo fica: com a foto real e com uma foto quase preta no lugar dela, o
 * pior pixel dá exatamente 4,68:1 nos dois casos. O véu é opaco ali, e o texto
 * nunca chega a encostar na fotografia — o desenho já resolve isso pondo o texto
 * na metade coberta.
 *
 * O que ela protege é o **composto**: o resultado na tela, venha de onde vier.
 * Enfraquecer o véu derruba o subtítulo para 1,00:1 e o teste falha — foi assim
 * que ele foi verificado. Alargar o bloco de texto para dentro da faixa
 * translúcida faria o mesmo. Nenhuma das duas coisas quebra qualquer outro
 * teste: a página desenha, os tokens continuam corretos, porque `palette-contrast`
 * mede pares de cor declarados e não pixels compostos, e o texto simplesmente
 * fica ilegível para quem tem baixa visão.
 *
 * O método é medir o que a tela mostra, não o que o CSS declara: esconde-se o
 * texto com `visibility` (que preserva o espaço), fotografa-se o retângulo que
 * ele ocupava, e compara-se a cor do texto com CADA pixel do fundo. O pior pixel
 * governa — um subtítulo legível em 95% da largura e ilegível numa palavra ainda
 * é um subtítulo ilegível.
 *
 * ⚠️ Ao verificar isto à mão, apague `.next/cache/images` antes. O otimizador do
 * Next serve `/_next/image?url=...` de cache próprio, e trocar o arquivo em
 * `public` não o invalida: duas execuções seguidas mediriam a mesma imagem
 * antiga e a prova pareceria passar.
 */
const MINIMO_AA = 4.5;

/** Luminância relativa da WCAG. */
function luminancia(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contraste(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("o subtítulo do topo se lê sobre o fundo composto", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const sub = page.locator("section p").first();
  await expect(sub).toBeVisible();

  const caixa = await sub.boundingBox();
  const cor = await sub.evaluate((e) => getComputedStyle(e).color);
  expect(caixa, "o subtítulo do topo não foi encontrado").not.toBeNull();

  // Sentinela: um seletor errado pegaria um parágrafo de 0 px e a varredura
  // abaixo passaria sem examinar pixel nenhum.
  expect(caixa!.width).toBeGreaterThan(100);
  expect(caixa!.height).toBeGreaterThan(20);

  await sub.evaluate((e) => {
    e.style.visibility = "hidden";
  });
  const fundo = await page.screenshot({ clip: caixa! });

  const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(cor);
  expect(rgb, `cor do texto ilegível: ${cor}`).not.toBeNull();
  const lTexto = luminancia(Number(rgb![1]), Number(rgb![2]), Number(rgb![3]));

  // Decodifica no canvas do próprio navegador: evita depender de um
  // decodificador de PNG no processo de teste.
  const pixels = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    c.getContext("2d")!.drawImage(img, 0, 0);
    return Array.from(c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data);
  }, fundo.toString("base64"));

  let pior = Number.POSITIVE_INFINITY;
  for (let i = 0; i < pixels.length; i += 4) {
    const c = contraste(lTexto, luminancia(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!));
    if (c < pior) pior = c;
  }

  expect(
    pior,
    `O subtítulo do topo tem ${pior.toFixed(2)}:1 no pior pixel, abaixo dos ${MINIMO_AA}:1 ` +
      `da WCAG AA. As causas prováveis, nesta ordem: o véu de leitura em ` +
      `hero-carousel.tsx ficou mais fraco, ou o bloco de texto passou a se ` +
      `estender para dentro da faixa translúcida à direita. A foto de fundo é a ` +
      `causa MENOS provável — medida em 03/09, ela não alcança esta faixa.`,
  ).toBeGreaterThanOrEqual(MINIMO_AA);
});
