import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";

/**
 * O painel pintava o estado de risco com cores que ninguém tinha medido.
 *
 * Cinco usos de vermelho cru do Tailwind, todos em `hover`: o botão de excluir,
 * o de remover instância do WhatsApp e o de tirar a imagem enviada. Três deles
 * são um PAR — texto `red-600` sobre um fundo `red-500/10` —, e é o par que
 * conta, porque o véu vermelho clareia o fundo e sobe a exigência de contraste.
 *
 * Medido contra as três superfícies do painel, **seis de seis reprovam**:
 *
 *     par (texto sobre o véu)     4,23  4,10  3,86
 *     texto sozinho               4,83  4,65  4,38
 *
 * O mínimo é 4,5:1. Com o token `--danger`, que existe desde 26/08 e foi
 * escolhido medindo contra ESTAS superfícies, os seis passam: 5,97 / 5,74 /
 * 5,43 no par e 7,19 / 6,92 / 6,52 sozinho.
 *
 * Estado de `hover` não é isento: a norma vale para todos os estados, e este é
 * justamente o momento em que a pessoa está prestes a apagar alguma coisa.
 *
 * ⚠️ A varredura é larga desde o começo, e isso é lição comprada. A guarda
 * equivalente do projeto irmão foi escrita estreita três vezes: pegava só
 * `text-*` enquanto o resto era `border-red-500`; depois só o que estava dentro
 * de `className=` enquanto o resto vivia numa constante; depois só uma pasta
 * enquanto oito casos viviam noutra. Aqui as duas pastas do painel entram,
 * qualquer prefixo de utilitário conta, e uma sentinela falha se alguma das
 * pastas deixar de ser varrida.
 */
const PASTAS = ["src/components/admin", "src/app/[locale]/admin"];

const PREFIXOS = "text|bg|border|ring|fill|stroke|from|to|via|outline|divide|shadow";
const FAMILIAS =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|" +
  "purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";

/** `text-red-600`, `hover:bg-red-500/10`, `border-amber-600` — com opacidade ou sem. */
const COR_CRUA = new RegExp(
  `\\b(${PREFIXOS})-(${FAMILIAS})-[0-9]{2,3}(/[0-9]{1,3})?\\b`,
  "g",
);

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) return arquivos(caminho);
    return /\.tsx?$/.test(entrada.name) ? [caminho] : [];
  });
}

/**
 * Sem comentários: a explicação acima cita as cores cruas pelo nome, e cinco
 * guardas deste projeto já falharam casando com a própria documentação.
 */
const semComentarios = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

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

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Lê um token direto do CSS, para o teste não guardar cópia dele. */
function token(nome: string): string {
  const achado = css.match(new RegExp("--" + nome + ":[^#]*(#[0-9a-fA-F]{3,8})"));
  expect(achado, `token --${nome} não encontrado em globals.css`).not.toBeNull();
  return achado![1]!;
}

describe("o painel não pinta estado com cor crua do Tailwind", () => {
  const alvos = PASTAS.flatMap((pasta) => arquivos(join(process.cwd(), pasta)));

  it("varreu as duas pastas do painel", () => {
    expect(alvos.length).toBeGreaterThan(20);
    for (const pasta of PASTAS) {
      expect(
        alvos.some((a) => a.includes(pasta.split("/").join(sep))),
        `nada varrido em ${pasta}`,
      ).toBe(true);
    }
  });

  it("não sobrou nenhuma", () => {
    const achados: string[] = [];
    for (const caminho of alvos) {
      const encontradas = semComentarios(readFileSync(caminho, "utf8")).match(COR_CRUA);
      if (encontradas) {
        achados.push(
          `${relative(process.cwd(), caminho).split(sep).join("/")}: ${[
            ...new Set(encontradas),
          ].join(", ")}`,
        );
      }
    }
    expect(achados, achados.join("\n")).toEqual([]);
  });
});

/**
 * A varredura prova que a cor crua saiu. Não prova que o que entrou serve — e o
 * painel usa o vermelho num padrão específico, o par texto-sobre-véu do
 * `hover`. Uma troca futura de token pode passar na varredura e devolver o
 * botão de excluir ao estado ilegível.
 */
describe("o estado de risco do painel é legível", () => {
  /*
   * O fundo vem de `siteConfig` e os neutros do CSS, porque é de onde cada um
   * de fato sai: `--background` é emitido por `theme-style.tsx` a partir da
   * paleta do cliente, e `--card`/`--muted` são tokens de interface que vivem
   * no `globals.css`. Ler os dois da mesma fonte guardaria uma cópia errada.
   */
  const superficies = {
    fundo: siteConfig.theme.background,
    cartao: token("card"),
    muted: token("muted"),
  };

  for (const [nome, onde] of Object.entries(superficies)) {
    it(`o par texto-sobre-véu no ${nome}`, () => {
      const cor = token("danger");
      const veu = achatar(cor, onde, 0.1);
      const razao = contraste(cor, veu);
      expect(razao, `${razao.toFixed(2)}:1 — mínimo 4,5`).toBeGreaterThanOrEqual(4.5);
    });

    it(`o texto sozinho no ${nome}`, () => {
      const razao = contraste(token("danger"), onde);
      expect(razao, `${razao.toFixed(2)}:1 — mínimo 4,5`).toBeGreaterThanOrEqual(4.5);
    });
  }
});
