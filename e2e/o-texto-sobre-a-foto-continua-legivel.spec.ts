import { expect, test } from "@playwright/test";

/**
 * O texto das aberturas continua legível sobre o que estiver atrás dele.
 *
 * A home e o cardápio abrem com texto sobre fotografia, cada um com seu véu.
 * Enquanto não havia foto, o fundo era um degradê claro da marca e o contraste
 * era o dos tokens, coberto por `test/palette-contrast.test.ts`. As fotos
 * chegaram em 03/09, e com elas três defeitos que nenhum teste existente via.
 *
 * **O que esta guarda mede é o COMPOSTO** — o pixel que aparece na tela, venha
 * do véu, da foto ou da largura do bloco de texto. É a diferença que importa:
 * `palette-contrast` compara pares de cor declarados no código, e nenhum par
 * declarado muda quando uma fotografia escura entra atrás do texto.
 *
 * ⚠️ **Três defeitos, em três eixos diferentes, e cada um só aparecia num
 * deles:**
 *
 * - **Home, celular:** 1,20:1. O véu de lá é um degradê HORIZONTAL, opaco à
 *   esquerda. Numa tela larga o texto ocupa a metade coberta; numa estreita ele
 *   atravessa até a ponta translúcida. O desktop media 4,68:1 e passava.
 * - **Cardápio, as duas larguras:** 4,27:1 e 4,13:1. Véu vertical fraco demais
 *   para uma foto escura de churrasco.
 * - **Home, desktop:** aqui a foto tem efeito ZERO — medido com a imagem real e
 *   com uma quase preta no lugar, dá 4,68:1 nos dois casos, porque o véu é
 *   opaco naquela faixa. O que a guarda protege ali é o véu não enfraquecer:
 *   afrouxá-lo derruba para 1,00:1, e foi assim que ela foi verificada.
 *
 * Rodar só uma página, ou só um tamanho, teria deixado passar dois dos três.
 *
 * O método é medir o que a tela mostra, não o que o CSS declara: esconde-se o
 * texto com `visibility` (que preserva o espaço), fotografa-se o retângulo que
 * ele ocupava, e compara-se a cor do texto com CADA pixel do fundo. O pior pixel
 * governa — um texto legível em 95% da largura e ilegível numa palavra ainda é
 * um texto ilegível.
 *
 * ⚠️ Ao verificar isto à mão trocando a foto, apague `.next/cache/images` antes.
 * O otimizador do Next serve `/_next/image?url=...` de cache próprio, e trocar o
 * arquivo em `public` não o invalida: duas execuções seguidas mediriam a mesma
 * imagem antiga e a prova pareceria passar.
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

/**
 * As aberturas com foto. Em ambas o primeiro parágrafo da primeira seção é o
 * texto secundário sobre a imagem: o subtítulo, na home, e a linha do horário,
 * no cardápio. `onde` nomeia o arquivo do véu para a mensagem de falha apontar
 * o lugar certo em vez de mandar quem lê procurar.
 */
const ABERTURAS = [
  {
    rota: "/",
    nome: "o topo da home",
    onde: "src/components/sections/hero-carousel.tsx",
  },
  {
    rota: "/cardapio",
    nome: "a abertura do cardápio",
    onde: "src/components/cardapio/menu-hero.tsx",
  },
];

for (const { rota, nome, onde } of ABERTURAS) {
  test(`${nome} se lê sobre o fundo composto`, async ({ page }) => {
    await page.goto(rota, { waitUntil: "networkidle" });

    const texto = page.locator("section p").first();
    await expect(texto).toBeVisible();

    const caixa = await texto.boundingBox();
    const cor = await texto.evaluate((e) => getComputedStyle(e).color);
    expect(caixa, `texto de abertura não encontrado em ${rota}`).not.toBeNull();

    // Sentinela: um seletor errado pegaria um parágrafo de 0 px e a varredura
    // abaixo passaria sem examinar pixel nenhum.
    expect(caixa!.width).toBeGreaterThan(100);
    expect(caixa!.height).toBeGreaterThan(10);

    await texto.evaluate((e) => {
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
      `${nome} tem ${pior.toFixed(2)}:1 no pior pixel, abaixo dos ${MINIMO_AA}:1 da ` +
        `WCAG AA. Causas prováveis: o véu em ${onde} ficou mais fraco, o bloco de ` +
        `texto passou a se estender para dentro da faixa translúcida, ou a foto de ` +
        `fundo trocou por uma mais escura. Se isto falha só num dos tamanhos, é o ` +
        `véu não acompanhando a largura — foi o defeito da home no celular.`,
    ).toBeGreaterThanOrEqual(MINIMO_AA);
  });
}
