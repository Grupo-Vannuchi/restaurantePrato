import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

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

/** O texto que o botão `accent` põe por cima dele — ver `ui/button.tsx`. */
const TEXTO_SOBRE_ACENTO = "#0a0a0a";

/** Todo arquivo de componente sob `src/`. */
function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(dir, e.name);
    if (e.isDirectory()) return arquivos(caminho);
    return /\.tsx?$/.test(e.name) ? [caminho] : [];
  });
}

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

const paleta: ThemePalette = siteConfig.theme;

describe("a paleta do restaurante", () => {
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

  it("o acento comporta texto escuro por cima", () => {
    // ⚠️ Esta asserção MUDOU de forma em 26/08, e a mudança precisa de defesa.
    //
    // Antes ela cobrava `accent` vs `background` >= 3:1, tratando o acento como
    // elemento gráfico solto. A secundária entregue pelo cliente é um verde-
    // limão claro: 1,92:1 sobre o off white. Escurecê-la para passar seria
    // inventar uma cor que o cliente não deu.
    //
    // O que se faz com ela no projeto é preenchimento de botão, e ali a regra
    // que protege o leitor não é "a cor se destaca do fundo", é "o texto se lê
    // sobre a cor" — o botão é localizado pelo rótulo, não pela mancha. É essa
    // que passa a ser cobrada, e ela é mais rigorosa: 4,5:1 em vez de 3:1.
    //
    // A contrapartida está na guarda seguinte: o acento não pode virar traço.
    const razao = contraste(TEXTO_SOBRE_ACENTO, paleta.accent);
    expect(razao, `${razao.toFixed(2)}:1 — mínimo 4.5:1`).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("o acento nunca é usado como texto sobre o fundo da página", () => {
    // A outra metade da decisão acima. Como superfície ele funciona; como
    // traço fino ou texto sobre o branco, seria quase invisível.
    const componentes = arquivos(join(process.cwd(), "src"));
    const comoTexto = componentes
      .filter((c) => /(?:^|\s|")text-accent(?:\s|"|$)/m.test(readFileSync(c, "utf8")))
      .map((c) => relative(process.cwd(), c).split(sep).join("/"));

    expect(comoTexto).toEqual([]);
  });
});

/**
 * Os números escritos nos comentários precisam ser os números medidos.
 *
 * Três estavam defasados desde a chegada da paleta em 26/08: o `brandForeground`
 * dizia 4,66:1 quando o valor é 4,98; o `accent` dizia 10,19 quando é 10,31; e o
 * `muted-foreground` dizia "6,92 / 6,52 / 6,08" quando é "6,92 / 6,65 / 6,27".
 *
 * Nenhum deles reprovava — todos passam, e passam com folga MAIOR do que o
 * comentário prometia. Mas comentário de contraste é o que a próxima pessoa lê
 * antes de decidir se pode mexer numa cor, e um número defasado convida a uma
 * decisão errada. Mesma família do "400+ páginas estáticas" e do React Compiler
 * que nunca esteve ligado: a regra estava certa, a justificativa é que tinha
 * inflado.
 */
describe("os comentários de contraste dizem o que a medição diz", () => {
  const virgula = (n: number) => n.toFixed(2).replace(".", ",");

  const site = readFileSync(join(process.cwd(), "src/config/site.ts"), "utf8");
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  /** Lê um token de cor direto do CSS, para o teste não guardar cópia dele. */
  const token = (nome: string): string => {
    // O padrão evita classes de espaço de propósito: a barra invertida
    // atravessa camadas de escape demais até chegar aqui, e `[^#]*` diz a
    // mesma coisa sem depender de nenhuma.
    const achado = css.match(new RegExp("--" + nome + ":[^#]*(#[0-9a-fA-F]{3,8})"));
    expect(achado, `token --${nome} não encontrado em globals.css`).not.toBeNull();
    return achado![1];
  };

  const documentados: { onde: string; texto: string; esperado: () => string }[] = [
    {
      onde: "src/config/site.ts · brandForeground",
      texto: site,
      esperado: () =>
        `${virgula(contraste(paleta.brandForeground, paleta.brand))}:1 sobre o brand`,
    },
    {
      onde: "src/config/site.ts · accent como superfície",
      texto: site,
      esperado: () => `${virgula(contraste(TEXTO_SOBRE_ACENTO, paleta.accent))}:1 com texto escuro`,
    },
    {
      onde: "src/app/globals.css · muted-foreground",
      texto: css,
      esperado: () =>
        [paleta.background, token("card"), token("muted")]
          .map((fundo) => virgula(contraste(token("muted-foreground"), fundo)))
          .join(" / "),
    },
  ];

  for (const { onde, texto, esperado } of documentados) {
    it(`${onde} anota o valor medido`, () => {
      const valor = esperado();
      expect(
        texto.includes(valor),
        `o comentário não contém "${valor}" — o número medido mudou e a ` +
          "documentação ao lado da cor ficou para trás",
      ).toBe(true);
    });
  }
});
