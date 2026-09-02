import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Menu que abre no mouse tem que abrir no teclado.
 *
 * Os menus suspensos do cabeçalho são CSS puro: o painel nasce `invisible` e
 * `group-hover:visible` o revela. Quem navega por teclado nunca dispara `hover`
 * — para essa pessoa o painel simplesmente não existe, e os links de dentro não
 * entram na ordem de tabulação (`visibility: hidden` os tira dela).
 *
 * O detalhe que torna isto um defeito e não uma decisão: os gatilhos já
 * carregam `group-focus-within:text-foreground`, ou seja, alguém pensou no
 * foco de teclado e mudou a cor do gatilho — mas o painel ficou de fora.
 *
 * **Por que um teste de código e não só de navegador.** Ele varre a fonte
 * inteira atrás do PADRÃO, não de um menu específico: qualquer painel novo que
 * apareça no `hover` passa a ser cobrado aqui no dia em que for escrito, antes
 * de existir rota para um teste de navegador visitar.
 *
 * ⚠️ A justificativa original era outra, e caducou em 31/08: o menu de
 * categorias do cardápio só renderizava quando havia categorias cadastradas, e
 * um teste de navegador não o veria. Aquele menu foi removido junto com a rota
 * `/gastronomia` — as categorias passaram a viver dentro das abas de dia, e não
 * há mais âncora para onde apontar. O teste continua valendo pela varredura.
 */
function arquivosDeComponente(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) return arquivosDeComponente(caminho);
    return /\.tsx$/.test(nome) ? [caminho] : [];
  });
}

/** Cada `className` que revela algo no hover, com o arquivo onde ela vive. */
function classesQueRevelamNoHover(): { arquivo: string; classe: string }[] {
  const raiz = join(process.cwd(), "src", "components");
  return arquivosDeComponente(raiz).flatMap((arquivo) => {
    const fonte = readFileSync(arquivo, "utf8");
    return [...fonte.matchAll(/className="([^"]*group-hover:visible[^"]*)"/g)].map(
      (m) => ({ arquivo: relative(process.cwd(), arquivo), classe: m[1] }),
    );
  });
}

describe("menu suspenso e teclado", () => {
  it("existe pelo menos um menu que abre no hover — senão este teste não guarda nada", () => {
    // Sem esta asserção o teste passaria por vacuidade no dia em que alguém
    // trocasse o mecanismo, e ninguém notaria que a guarda parou de guardar.
    expect(classesQueRevelamNoHover().length).toBeGreaterThan(0);
  });

  it("todo painel que abre no hover também abre no foco", () => {
    const falhas = classesQueRevelamNoHover()
      .filter(({ classe }) => !classe.includes("group-focus-within:visible"))
      .map(({ arquivo }) => arquivo);

    expect(falhas).toEqual([]);
  });

  it("o painel que aparece no foco também fica opaco no foco", () => {
    // `visible` sem `opacity-100` deixa o painel presente e transparente: os
    // links entram na ordem de tabulação e continuam invisíveis, que é pior
    // que o defeito original — o foco vai para um lugar que ninguém vê.
    const falhas = classesQueRevelamNoHover()
      .filter(({ classe }) => classe.includes("opacity-0") &&
                              !classe.includes("group-focus-within:opacity-100"))
      .map(({ arquivo }) => arquivo);

    expect(falhas).toEqual([]);
  });
});
