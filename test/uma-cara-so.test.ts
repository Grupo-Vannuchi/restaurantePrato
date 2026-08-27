import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";

/**
 * O site do Prato tem uma cara só, e isso é decisão, não omissão.
 *
 * Ele nasceu com três estados de aparência — claro, escuro e "o que o sistema
 * estiver usando" — herdados do projeto do qual é fork, com um botão para
 * trocar. O cliente entregou UMA paleta em 26/08: off white, quase-preto e dois
 * verdes. Manter os três estados significaria inventar as variações escuras que
 * ele não forneceu, e uma cor inventada num site de cliente é o mesmo problema
 * que um horário inventado.
 *
 * A guarda existe porque a maquinaria de tema é fácil de reintroduzir sem
 * querer: basta alguém usar a variante `dark:` do Tailwind, que enxerga
 * `prefers-color-scheme` sozinha e repintaria o site pelas costas de quem está
 * com o sistema no escuro.
 */
const RAIZ = join(process.cwd(), "src");

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(dir, e.name);
    if (e.isDirectory()) return arquivos(caminho);
    return /\.(tsx?|css)$/.test(e.name) ? [caminho] : [];
  });

const semComentarios = (texto: string) =>
  texto
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

describe("a paleta do site", () => {
  it("é uma só, sem variante clara e escura", () => {
    expect(siteConfig.theme).toHaveProperty("background");
    expect(siteConfig.theme).not.toHaveProperty("light");
    expect(siteConfig.theme).not.toHaveProperty("dark");
  });

  it("declara o esquema de cor ao navegador", () => {
    // `color-scheme` é o que faz o navegador pintar campo de formulário, barra
    // de rolagem e barra de endereço no tom certo. Sem ele, quem está com o
    // sistema no escuro vê um site claro com controles escuros.
    const fonte = readFileSync(
      join(RAIZ, "components", "theme-style.tsx"),
      "utf8",
    );
    expect(fonte).toMatch(/color-scheme:\s*light/);
  });
});

describe("a maquinaria de tema", () => {
  it("não existe mais o alternador", () => {
    expect(existsSync(join(RAIZ, "components", "layout", "theme-toggle.tsx"))).toBe(
      false,
    );
  });

  it("ninguém consulta a preferência do sistema nem marca o documento", () => {
    const infratores = arquivos(RAIZ)
      .filter((c) => {
        const fonte = semComentarios(readFileSync(c, "utf8"));
        return (
          /prefers-color-scheme/.test(fonte) ||
          /data-theme/.test(fonte) ||
          /(?:^|\s|")dark:/m.test(fonte)
        );
      })
      .map((c) => relative(process.cwd(), c).split(sep).join("/"));

    expect(infratores).toEqual([]);
  });

  it("continua havendo código para varrer — senão a guarda não guarda", () => {
    expect(arquivos(RAIZ).length).toBeGreaterThan(50);
  });
});
