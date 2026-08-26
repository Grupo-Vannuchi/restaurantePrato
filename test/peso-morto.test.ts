import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Peso que o visitante baixa e nunca vê.
 *
 * Fonte é o caso mais caro por byte: `next/font` gera um `<link rel="preload">`
 * de ALTA prioridade para cada família declarada, então uma família morta não
 * só pesa — ela disputa a banda com o que a pessoa está esperando ver.
 *
 * A Geist Mono estava declarada, aplicada no `<html>` e mapeada no tema, e o
 * utilitário `font-mono` não aparecia em nenhum componente: 23.108 bytes e uma
 * requisição prioritária, em toda carga a frio, para zero pixels.
 */
const LAYOUT = readFileSync(
  join(process.cwd(), "src", "app", "[locale]", "layout.tsx"),
  "utf8",
);
const CSS = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

const RAIZ = join(process.cwd(), "src");
const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(dir, e.name);
    if (e.isDirectory()) return arquivos(caminho);
    return /\.tsx?$/.test(e.name) ? [caminho] : [];
  });
const TODO_CODIGO = arquivos(RAIZ).map((c) => readFileSync(c, "utf8")).join("\n");

describe("as fontes declaradas", () => {
  it("toda família baixada é usada em algum lugar", () => {
    const familias: { nome: string; utilitario: RegExp }[] = [
      { nome: "Geist_Mono", utilitario: /\bfont-mono\b/ },
      { nome: "Playfair_Display", utilitario: /\bfont-serif\b/ },
    ];

    const mortas = familias
      .filter((f) => new RegExp(f.nome).test(LAYOUT))
      .filter((f) => !f.utilitario.test(TODO_CODIGO) && !f.utilitario.test(CSS.replace(/--font-\w+:/g, "")))
      .map((f) => f.nome);

    expect(mortas).toEqual([]);
  });

  it("continua havendo fonte declarada — senão a guarda não guarda", () => {
    expect(LAYOUT).toMatch(/next\/font\/google/);
  });
});

describe("o CSS herdado do fork", () => {
  it("não carrega regras que nenhum componente usa", () => {
    // `.marquee` e seu `@keyframes` vieram da faixa "as marcas que confiam na
    // gente" do site da agência. O Tailwind v4 não purga CSS escrito à mão
    // dentro de `globals.css`, então isso embarcava em toda página.
    const orfas = ["marquee"].filter(
      (classe) => CSS.includes(classe) && !TODO_CODIGO.includes(classe),
    );

    expect(orfas).toEqual([]);
  });
});
