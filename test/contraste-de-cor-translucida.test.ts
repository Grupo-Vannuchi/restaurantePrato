import { readFileSync } from "node:fs";
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
