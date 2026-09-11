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

/** A tinta com que o texto é de fato pintado: cor e opacidade efetiva. */
export type Tinta = { r: number; g: number; b: number; alfa: number };

/**
 * Lê a cor de texto de um elemento **e a opacidade com que ela chega à tela**.
 *
 * ⚠️ **A opacidade é a parte que faltava, e sem ela esta função mentia.** Ela
 * devolvia só a luminância de `getComputedStyle(e).color`, que é sempre a cor
 * OPACA: num `<p class="opacity-90">` branco sobre o verde da marca ela
 * respondia branco puro, 4,98:1, quando a tinta que aparece é branco a 90% e o
 * número real é 4,40:1 — abaixo do mínimo. O defeito ficaria invisível
 * justamente para a guarda escrita para achá-lo.
 *
 * Três fontes de transparência se multiplicam e todas contam:
 *
 * - `opacity` no próprio elemento (`opacity-90`)
 * - `opacity` em qualquer ANCESTRAL, que se aplica ao subárvore inteira
 * - o alfa do próprio `color`, quando vem como `rgba(…, 0.8)`
 *
 * O laço sobe até a raiz multiplicando tudo; ancestral com `opacity: 1` não
 * muda nada, que é o caso quase sempre. Ele existe porque um pai translúcido
 * afeta a subárvore inteira sem aparecer no `color` computado do filho.
 */
export async function tintaDoTexto(alvo: Locator): Promise<Tinta> {
  return alvo.evaluate((e) => {
    const cor = getComputedStyle(e).color;
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(cor);
    if (!m) throw new Error(`cor de texto ilegível: ${cor}`);

    let alfa = m[4] === undefined ? 1 : Number(m[4]);
    for (let n: Element | null = e; n; n = n.parentElement) {
      alfa *= Number(getComputedStyle(n).opacity);
    }

    return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), alfa };
  });
}

/**
 * Decodifica um PNG no canvas do PRÓPRIO navegador e devolve as cores DISTINTAS
 * que ele contém, sem repetição.
 *
 * Decodificar no navegador evita depender de um decodificador de PNG no processo
 * de teste. Deduplicar antes de devolver é o que torna isto rápido.
 *
 * ⚠️ **A versão anterior serializava todos os pixels, e isso quase matou uma
 * guarda.** Ela devolvia `Array.from(getImageData().data)`: para um recorte de
 * 400×100 numa tela de celular, com densidade 2,6, são mais de um milhão de
 * números atravessando a ponte com o navegador — por MEDIÇÃO, e o cartão de
 * fechamento faz quatro. O spec levava 12,7 s sozinho e estourava os 30 s
 * quando a suíte rodava com dois trabalhadores. Guarda lenta que pisca sob
 * carga é guarda que as pessoas aprendem a ignorar.
 *
 * Para a pergunta "qual é o PIOR pixel" a repetição não acrescenta nada: o
 * resultado é idêntico e o transporte cai por um fator grande — num cartão de
 * cor chapada, de um milhão de números para algumas dezenas.
 *
 * A fórmula da WCAG continua vivendo num lugar só, aqui no processo de teste. É
 * a razão de deduplicar em vez de calcular o contraste dentro da página: lá
 * dentro não há acesso a este módulo, e a conta viraria uma segunda cópia.
 */
export async function coresDistintas(page: Page, png: Buffer): Promise<number[]> {
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const dados = ctx.getImageData(0, 0, c.width, c.height).data;

    // `Set` de inteiro empacotado: comparar números é o que deixa isto barato.
    const vistas = new Set<number>();
    for (let i = 0; i < dados.length; i += 4) {
      vistas.add((dados[i]! << 16) | (dados[i + 1]! << 8) | dados[i + 2]!);
    }
    const saida: number[] = [];
    for (const v of vistas) {
      saida.push((v >> 16) & 255, (v >> 8) & 255, v & 255, 255);
    }
    return saida;
  }, png.toString("base64"));
}

/**
 * O pior contraste entre a tinta do texto e cada pixel de um retângulo de fundo.
 *
 * A tinta é composta SOBRE CADA PIXEL antes da conta, porque é isso que
 * acontece na tela: texto a 90% de opacidade sobre fundo escuro resulta numa
 * cor diferente do mesmo texto sobre fundo claro. Compor uma vez, contra uma
 * média, esconderia justamente o pior ponto — que é o que governa.
 */
export function piorContraste(tinta: Tinta, dados: number[]): number {
  let pior = Number.POSITIVE_INFINITY;
  for (let i = 0; i < dados.length; i += 4) {
    const fr = dados[i]!;
    const fg = dados[i + 1]!;
    const fb = dados[i + 2]!;
    const lFundo = luminancia(fr, fg, fb);
    const lTinta = luminancia(
      tinta.r * tinta.alfa + fr * (1 - tinta.alfa),
      tinta.g * tinta.alfa + fg * (1 - tinta.alfa),
      tinta.b * tinta.alfa + fb * (1 - tinta.alfa),
    );
    const c = contraste(lTinta, lFundo);
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
   * ⚠️ **Espera a animação de entrada TERMINAR, e isto não é paciência
   * defensiva: sem ela a medição é de um quadro intermediário.**
   *
   * Rolar até o elemento é o que dispara o `IntersectionObserver` do `Reveal`,
   * e o cartão então leva 0,7 s subindo de `opacity: 0` para 1. Fotografando na
   * hora, o fundo capturado é uma mistura do verde do cartão com o branco da
   * página — o título do cartão de fechamento, que é branco opaco sobre verde e
   * mede 4,98:1, apareceu como 1,60:1 numa página e 2,80:1 na mesma página
   * noutro tamanho de tela. Números baixos e instáveis, que pareciam defeito.
   *
   * A espera é pela OPACIDADE chegar a 1, não por um tempo fixo: com
   * `prefers-reduced-motion: reduce` a transição dura 0,01 ms e a espera acaba
   * no primeiro quadro, e nenhuma medição paga 700 ms que não precisa.
   */
  await alvo.evaluate(
    (e) =>
      new Promise<void>((resolve) => {
        const revelado = e.closest("[data-reveal]");
        if (!revelado) return resolve();
        const limite = performance.now() + 3000;
        const olha = () => {
          const opaco = Number(getComputedStyle(revelado).opacity) >= 0.999;
          if (opaco || performance.now() > limite) return resolve();
          requestAnimationFrame(olha);
        };
        olha();
      }),
  );

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

  const tinta = await tintaDoTexto(alvo);

  /*
   * ⚠️ **Devolve o que mexeu, e isso é correção de um defeito real desta
   * função.** Ela apagava a tinta e ia embora deixando o `style.color` inline
   * no elemento. Numa segunda medição do MESMO elemento — que é o caso quando
   * um selo tem dois estados — a leitura da tinta pegava `rgba(0, 0, 0, 0)`, a
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

  const pior = piorContraste(tinta, await coresDistintas(page, fundo));

  return { pior, largura: caixa.width, altura: caixa.height };
}
