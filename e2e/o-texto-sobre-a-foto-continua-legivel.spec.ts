import { expect, test } from "@playwright/test";

import { contrasteNaTela } from "./contraste";

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
/*
 * ⚠️ **A fórmula da WCAG e a decodificação dos pixels vivem em
 * `e2e/contraste.ts`.** Estavam escritas aqui e, depois, outra vez na guarda do
 * selo de hoje — e duas cópias da mesma conta divergem. Quando divergem, uma das
 * duas guardas passa a afirmar um número que ninguém conferiu.
 */
const MINIMO_AA = 4.5;

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
    seletor: "section p",
    onde: "src/components/sections/hero-carousel.tsx",
  },
  {
    rota: "/cardapio",
    nome: "a abertura do cardápio",
    seletor: "section p",
    onde: "src/components/cardapio/menu-hero.tsx",
  },
  /*
   * As faixas de título com foto, que entraram em 10/09 quando a galeria passou
   * a mostrar só comida e o ambiente mudou de lugar. São três superfícies novas
   * de texto sobre fotografia, e o seletor é outro: `PageHeader` é um `div`, não
   * um `section`, e o texto medido é o subtítulo logo depois do `h1`.
   *
   * Medidas ao entrar, com o véu atual: a pior das três dá 8,12:1. A folga é
   * grande de propósito — a foto de ambiente pode ser trocada por uma mais
   * clara sem aviso, e é a foto que manda aqui.
   */
  {
    rota: "/reservas",
    nome: "a faixa de Horários",
    seletor: "h1 + p",
    onde: "src/components/page-header.tsx",
  },
  {
    rota: "/experiencia",
    nome: "a faixa da Experiência",
    seletor: "h1 + p",
    onde: "src/components/page-header.tsx",
  },
  {
    rota: "/contato",
    nome: "a faixa de Contato",
    seletor: "h1 + p",
    onde: "src/components/page-header.tsx",
  },
];

for (const { rota, nome, seletor, onde } of ABERTURAS) {
  test(`${nome} se lê sobre o fundo composto`, async ({ page }) => {
    /*
     * ⚠️ **Movimento reduzido, e não é preferência estética: sem isto a guarda
     * mede um carrossel que se move por baixo dela.**
     *
     * O topo da home ganhou autoplay de três slides em 09/09. Antes havia um
     * slide e nada mexia. Com três, entre `boundingBox()` e a captura o
     * carrossel troca de slide, e a medição sai de um quadro que já não existe
     * — deu 1,00:1 numa execução e 11:1 na seguinte, com o mesmo código.
     *
     * O componente desliga o autoplay sob `prefers-reduced-motion`, então
     * emular a preferência congela o primeiro slide. A medição fica MAIS
     * fiel, não menos: o primeiro quadro é o que o visitante vê ao chegar, e é
     * o único que todo mundo vê.
     */
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(rota, { waitUntil: "load" });

    const texto = page.locator(seletor).first();
    await expect(texto, `texto de abertura não encontrado em ${rota}`).toBeVisible();

    /*
     * Recorte pela caixa do elemento e véu escondido com `visibility` — os dois
     * padrões do helper. Aqui é o certo: o fundo é pintado por OUTRO elemento (o
     * véu, a foto), então esconder o texto preservando o espaço mostra
     * exatamente o que está atrás dele.
     */
    const { pior, largura, altura } = await contrasteNaTela(page, texto);

    // Sentinela: um seletor errado pegaria um parágrafo de 0 px e a varredura
    // passaria sem examinar pixel nenhum.
    expect(largura, `o texto de ${rota} não tem largura`).toBeGreaterThan(100);
    expect(altura, `o texto de ${rota} não tem altura`).toBeGreaterThan(10);

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
