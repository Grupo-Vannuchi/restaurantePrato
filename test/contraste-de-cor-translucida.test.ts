import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";

/**
 * Cor translúcida também precisa alcançar contraste — e nenhum teste olhava.
 *
 * `test/palette-contrast.test.ts` mede os tokens da paleta, que estão sólidos.
 * O que reprovava eram as composições: `border-white/40`, `bg-foreground/30` e
 * um hexadecimal de terceiro. Nenhuma dessas cores existe como token, então a
 * verificação da paleta passava verde enquanto três elementos gráficos ficavam
 * abaixo do mínimo.
 *
 * O limite é o da WCAG 1.4.11 (nível AA): **3:1** para elemento gráfico e borda
 * de componente. É o que separa "dá para ver a borda do botão" de "o botão
 * parece um texto solto".
 *
 * O teste lê a opacidade da própria fonte e refaz a conta. Trocar `/70` de volta
 * por `/40` faz ele falhar dizendo o número, e não apenas que "mudou".
 */
const MINIMO = 3;

function luminancia(hex: string): number {
  const c = hex.replace("#", "");
  const canais = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contraste(a: string, b: string): number {
  const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (maior! + 0.05) / (menor! + 0.05);
}

/** Achata uma cor com opacidade sobre o fundo que estiver atrás dela. */
function achatar(frente: string, fundo: string, alfa: number): string {
  const f = frente.replace("#", "");
  const b = fundo.replace("#", "");
  return (
    "#" +
    [0, 2, 4]
      .map((i) =>
        Math.round(
          parseInt(f.slice(i, i + 2), 16) * alfa +
            parseInt(b.slice(i, i + 2), 16) * (1 - alfa),
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/**
 * A fonte SEM comentários.
 *
 * ⚠️ Não é zelo: esta guarda falhou na primeira execução casando com a própria
 * explicação, escrita no comentário do componente logo acima do código que ela
 * proíbe. É a terceira vez que isso acontece no projeto — a guarda do `<aside>`,
 * a do modal e a do `startTransition` caíram todas nessa. Comentário descreve o
 * defeito; código é que o comete.
 */
const fonte = (caminho: string) =>
  readFileSync(caminho, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

/**
 * As três superfícies claras onde uma cor tingida pode cair, lidas do CSS.
 * A mais escura é a que governa qualquer conta de contraste sobre tinta.
 */
const TOKENS_DE_SUPERFICIE = (() => {
  const css = fonte("src/app/globals.css");
  const ler = (nome: string) => {
    // `String.raw` porque num template literal comum o `\s` da expressão vira
    // um "s" solto, e a busca passa a ser por "--card:s*#…" — que não existe.
    const achado = new RegExp(String.raw`--${nome}:\s*(#[0-9a-fA-F]{6})`).exec(css);
    // Erro comum e não `expect`: isto roda na COLETA do arquivo, antes de
    // existir um teste a que atribuir a falha — um `expect` aqui derruba o
    // arquivo inteiro com "no tests", que esconde a causa.
    if (!achado) throw new Error(`token --${nome} não encontrado em globals.css`);
    return achado[1]!;
  };
  return { branco: "#FFFFFF", card: ler("card"), muted: ler("muted") };
})();

/** Lê a opacidade de uma classe do Tailwind, ex.: `border-white/70` -> 0.7. */
function opacidadeDaClasse(texto: string, classe: string): number {
  const achado = texto.match(new RegExp(classe + "/([0-9]{1,3})"));
  expect(achado, `classe ${classe}/N não encontrada`).not.toBeNull();
  return Number(achado![1]) / 100;
}

describe("as cores translúcidas alcançam contraste de elemento gráfico", () => {
  it("a borda do botão vazado sobre o cartão da marca", () => {
    // O botão só é identificável pela borda: sem ela some no cartão colorido.
    for (const caminho of [
      "src/components/sections/cta.tsx",
      "src/app/[locale]/(marketing)/experiencia/page.tsx",
    ]) {
      const alfa = opacidadeDaClasse(fonte(caminho), "border-white");
      const cor = achatar("#FFFFFF", siteConfig.theme.brand, alfa);
      const razao = contraste(cor, siteConfig.theme.brand);
      expect(
        razao,
        `${caminho}: border-white/${alfa * 100} dá ${razao.toFixed(2)}:1 sobre a marca`,
      ).toBeGreaterThanOrEqual(MINIMO);
    }
  });

  it("o indicador inativo do carrossel sobre o fundo da página", () => {
    const texto = fonte("src/components/sections/hero-carousel.tsx");
    const alfa = opacidadeDaClasse(texto, "bg-foreground");
    const cor = achatar(siteConfig.theme.foreground, siteConfig.theme.background, alfa);
    const razao = contraste(cor, siteConfig.theme.background);
    expect(
      razao,
      `bg-foreground/${alfa * 100} dá ${razao.toFixed(2)}:1 sobre o fundo`,
    ).toBeGreaterThanOrEqual(MINIMO);
  });

  it("o ícone do WhatsApp sobre o verde do botão flutuante", () => {
    // O ícone é o conteúdo inteiro do botão, não decoração: sem ele o botão não
    // diz o que faz. O verde é da marca WhatsApp, o que explica mas não resolve
    // — e a própria WhatsApp tem um verde escuro na paleta dela.
    const texto = fonte("src/components/layout/whatsapp-button.tsx");
    const verde = texto.match(/bg-\[(#[0-9A-Fa-f]{6})\]/);
    expect(verde, "cor de fundo do botão do WhatsApp não encontrada").not.toBeNull();
    const razao = contraste("#FFFFFF", verde![1]!);
    expect(
      razao,
      `ícone branco sobre ${verde![1]} dá ${razao.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(MINIMO);
  });

  it("o texto do card de novidades sobre a foto do cliente", () => {
    /*
     * O pior ponto possível, e ele é composto de quatro camadas:
     * foto totalmente clara → tingimento da marca na ponta MAIS CLARA do
     * degradê (`to-brand/60`) → o `group-hover:opacity-90` baixando esse
     * tingimento → o véu escuro, que o mesmo hover também baixa.
     *
     * Sem foto o card fica sobre a marca opaca e passa: o defeito nasce
     * exatamente quando o cliente publica as imagens.
     */
    const card = fonte("src/components/information-card.tsx");
    const css = fonte("src/app/globals.css");

    const veuClaro = Number(card.match(/to-brand\/([0-9]{1,3})/)![1]) / 100;
    const hover = Number(card.match(/group-hover:opacity-([0-9]{1,3})/)![1]) / 100;
    const escuro = Number(css.match(/--veu:\s*([0-9]{1,3})%/)![1]) / 100;

    const marcaSobreFoto = achatar(siteConfig.theme.brand, "#FFFFFF", veuClaro * hover);
    const comVeu = achatar(siteConfig.theme.foreground, marcaSobreFoto, escuro * hover);

    const titulo = contraste("#FFFFFF", comVeu);
    expect(
      titulo,
      `título branco dá ${titulo.toFixed(2)}:1 no ponto mais claro do card`,
    ).toBeGreaterThanOrEqual(4.5);

    const borda = Number(card.match(/border-white\/([0-9]{1,3})/)![1]) / 100;
    const razaoBorda = contraste(achatar("#FFFFFF", comVeu, borda), comVeu);
    expect(
      razaoBorda,
      `a borda dos botões dá ${razaoBorda.toFixed(2)}:1 no mesmo ponto`,
    ).toBeGreaterThanOrEqual(MINIMO);
  });

  it("nenhuma pastilha tingida da marca carrega texto", () => {
    /*
     * **Pastilha tingida com texto da mesma cor só funciona se a cor for escura
     * o bastante.** Medido sobre as três superfícies do site:
     *
     *   text-success sobre bg-success/10 ..... 5,04 a 5,54:1  ✅
     *   text-danger  sobre bg-danger/10  ..... 5,43 a 5,97:1  ✅
     *   text-brand   sobre bg-brand/10   ..... 4,01 a 4,40:1  ❌
     *
     * O verde da marca é o token mais claro dos três — já vive em 4,98:1 contra
     * o branco — e não sobrevive ao próprio tom a 10%. Não existe verde escuro na
     * paleta do cliente para usar no texto, e inventar um é proibido, então onde
     * há TEXTO a saída é a cor cheia com texto claro.
     *
     * ⚠️ **O par `bg-brand/10` + `text-brand` continua permitido, e não é
     * incoerência: ele também veste os quadradinhos de ÍCONE** de `/contato`,
     * `/experiencia` e `/reservas`, onde a cor da marca é `currentColor` de um
     * traço — elemento gráfico, cujo mínimo é 3:1 (WCAG 1.4.11) e que passa com
     * folga em 4,01. Trocá-los por verde cheio seria mudar o desenho de três
     * páginas sem ganho de acessibilidade nenhum.
     *
     * O discriminador é o TAMANHO DE TEXTO na mesma string de classe: quem
     * declara `text-xs` está vestindo letra, quem não declara está vestindo um
     * ícone. É decidível, ao contrário de "este elemento tem texto?".
     *
     * ⚠️ **A limitação, escrita porque ela deixou passar um caso real.** Quando
     * o tamanho está na string BASE de um `cn()` e a pastilha num ramo do
     * ternário, os dois não estão na mesma string e a varredura não os pareia.
     * Foi assim que o item ativo da lista lateral de `/novidades` escapou —
     * `text-sm` na base, `bg-brand/10 text-brand` no ramo — e ele foi achado a
     * olho, medido em 4,24:1 e corrigido em 11/09. O que cobre o caso geral é a
     * medição de pixel dos specs de contraste em `e2e/`, que não depende de
     * conseguir ler a intenção do código.
     */
    const TAMANHO_DE_TEXTO = /\btext-(xs|sm|base|lg|xl|[2-9]xl|\[[^\]]+\])/;

    const arquivos = readdirSync("src", { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => join("src", f));

    // Sentinela: um glob que não acha nada passaria sem examinar uma linha.
    expect(arquivos.length, "nenhum .tsx encontrado em src/").toBeGreaterThan(30);

    const achados: string[] = [];
    for (const caminho of arquivos) {
      const texto = fonte(caminho);
      for (const [, classes] of texto.matchAll(/"([^"\n]*bg-brand\/\d{1,3}[^"\n]*)"/g)) {
        const alfa = Number(/bg-brand\/(\d{1,3})/.exec(classes!)![1]) / 100;
        const temTextoDaMarca = /\btext-brand\b/.test(classes!);
        const temTamanho = TAMANHO_DE_TEXTO.test(classes!);

        // A superfície mais escura das três é a que governa.
        const fundo = achatar(siteConfig.theme.brand, TOKENS_DE_SUPERFICIE.muted, alfa);
        const razao = contraste(siteConfig.theme.brand, fundo);

        if (temTextoDaMarca && razao < MINIMO) {
          achados.push(`${caminho}: "${classes}" dá ${razao.toFixed(2)}:1 como GRÁFICO`);
        }
        if (temTextoDaMarca && temTamanho && razao < 4.5) {
          achados.push(
            `${caminho}: "${classes}" veste TEXTO (declara tamanho de fonte) e dá ` +
              `${razao.toFixed(2)}:1, abaixo dos 4,5:1 da AA — use bg-brand com ` +
              `text-brand-foreground, que dá 4,98:1`,
          );
        }
      }
    }

    expect(achados, achados.join("\n")).toEqual([]);
  });

  it("o selo de hoje se lê nos dois estados da aba", () => {
    /*
     * ⚠️ **Este caso é texto, então o mínimo é 4,5:1 e não os 3:1 do resto do
     * arquivo.** O selo é `text-[10px]`, bem longe da isenção de texto grande.
     *
     * O defeito que ele guarda: o selo era translúcido nas duas posições, e
     * translúcido sobre superfície da mesma família de cor não rende contraste.
     * `bg-background/20` herdando o texto branco da aba selecionada dava
     * 3,38:1; `bg-brand/10` com `text-brand` sobre o cartão dava 4,24:1.
     *
     * ⚠️ **Ele acompanha um e2e, e a divisão de trabalho é o fim de semana.**
     * `e2e/o-selo-de-hoje-se-le.spec.ts` mede o pixel de verdade na tela, que é
     * a medida boa — mas o selo só é renderizado de segunda a sexta, porque é
     * então que a casa abre, e no sábado aquele teste se declara pulado. Este
     * roda todo dia lendo a fonte. Um cobre o pixel, o outro cobre a classe.
     *
     * ⚠️ **A cor de texto tem de estar DECLARADA em cada estado.** No estado
     * selecionado ela era herdada da aba, e herdar cor de texto é justamente
     * como se chega a branco sobre branco-a-20%: ninguém escolheu aquele par,
     * ele apareceu.
     */
    const texto = fonte("src/components/cardapio/day-tabs.tsx");
    const css = fonte("src/app/globals.css");

    const TOKENS: Record<string, string> = {
      background: siteConfig.theme.background,
      foreground: siteConfig.theme.foreground,
      brand: siteConfig.theme.brand,
      "brand-foreground": siteConfig.theme.brandForeground,
      accent: siteConfig.theme.accent,
      card: css.match(/--card:\s*(#[0-9a-fA-F]{6})/)![1]!,
      muted: css.match(/--muted:\s*(#[0-9a-fA-F]{6})/)![1]!,
      "muted-foreground": css.match(/--muted-foreground:\s*(#[0-9a-fA-F]{6})/)![1]!,
    };

    /*
     * As superfícies atrás do selo, uma por estado — é o que a aba pinta.
     * Sentinela: se a aba trocar de cor, estes dois `toContain` falham e o
     * cálculo abaixo não passa a medir contra um fundo que não existe mais.
     */
    expect(texto, "a aba selecionada não é mais bg-brand").toContain("bg-brand ");
    expect(texto, "a aba sem seleção não é mais bg-card").toContain("bg-card ");
    const SUPERFICIES = [TOKENS.brand!, TOKENS.card!];

    /*
     * `text-[10px]` só existe no selo, e é por ele que o trecho é localizado —
     * mas o recorte começa no `cn(` que abre a chamada, e não no marcador.
     * ⚠️ Cortando a partir do marcador, a primeira aspa encontrada é a que
     * FECHA a string base: o pareamento sai deslocado de um e as "classes"
     * extraídas viram os pedaços de código entre as strings de verdade.
     */
    const marcador = texto.indexOf("text-[10px]");
    expect(marcador, "o selo do dia de hoje não foi encontrado").toBeGreaterThan(-1);
    const inicio = texto.lastIndexOf("cn(", marcador);
    const trecho = texto.slice(inicio, texto.indexOf(")}", marcador));

    // A primeira string é a base (a que contém o `text-[10px]`); as seguintes
    // são os dois ramos do ternário, na ordem: selecionada, depois sem seleção.
    const estados = [...trecho.matchAll(/"([^"]+)"/g)].map((m) => m[1]!).slice(1);
    expect(
      estados.length,
      "esperava duas listas de classe no selo, uma por estado da aba",
    ).toBe(2);

    const nomes = ["com a aba selecionada", "com a aba sem seleção"];

    estados.forEach((classes, i) => {
      const fundoM = classes.match(/bg-([a-z-]+)(?:\/([0-9]{1,3}))?/);
      const textoM = classes.match(/text-([a-z-]+)(?:\/([0-9]{1,3}))?/);

      expect(fundoM, `${nomes[i]}: o selo não declara cor de fundo`).not.toBeNull();
      expect(
        textoM,
        `${nomes[i]}: o selo não declara cor de TEXTO e herda a da aba — foi ` +
          `exatamente assim que ele chegou a 3,38:1`,
      ).not.toBeNull();

      const hexDo = (nome: string) => {
        const hex = TOKENS[nome];
        // Sentinela: token fora do mapa falha em vez de o caso passar sem medir.
        expect(hex, `token "${nome}" não está no mapa deste teste`).toBeDefined();
        return hex!;
      };

      const superficie = SUPERFICIES[i]!;
      const alfaFundo = fundoM![2] ? Number(fundoM![2]) / 100 : 1;
      const fundoDoSelo = achatar(hexDo(fundoM![1]!), superficie, alfaFundo);

      const alfaTexto = textoM![2] ? Number(textoM![2]) / 100 : 1;
      const corDoTexto = achatar(hexDo(textoM![1]!), fundoDoSelo, alfaTexto);

      const razao = contraste(corDoTexto, fundoDoSelo);
      expect(
        razao,
        `${nomes[i]}: "${classes}" dá ${razao.toFixed(2)}:1 sobre ${superficie} — ` +
          `abaixo de 4,5:1. Cor translúcida sobre superfície da mesma família não ` +
          `rende contraste; o par sólido invertido dá 4,98:1.`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("nenhum anel de foco pinta da mesma cor do que está atrás dele", () => {
    // `focus-visible:ring-[#25D366]` desenhava um anel da MESMA cor do fundo do
    // botão: um anel que não anela. Não causava dano (o contorno global aparece
    // por cima), mas é a mesma confusão que deixou o anel da marca invisível no
    // cartão da marca.
    const texto = fonte("src/components/layout/whatsapp-button.tsx");
    const fundo = texto.match(/bg-\[(#[0-9A-Fa-f]{6})\]/)?.[1];
    const anel = texto.match(/ring-\[(#[0-9A-Fa-f]{6})\]/)?.[1];
    if (!anel) return; // sem anel próprio: o contorno global de `globals.css` basta
    expect(contraste(anel, fundo!)).toBeGreaterThanOrEqual(MINIMO);
  });
});
