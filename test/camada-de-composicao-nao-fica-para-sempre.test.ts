import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `will-change` é para o instante ANTES da animação, não para sempre.
 *
 * `[data-reveal]` declarava `will-change: opacity, transform` e nada removia a
 * declaração depois que o elemento aparecia. Cada elemento revelado mantinha
 * uma camada de composição própria pelo resto da vida da página — e em
 * `/gastronomia` e `/galeria` são dezenas de cards, todos já parados.
 *
 * O custo não é teórico: camada de composição é memória de vídeo, e o aparelho
 * que sofre com isso é justamente o celular modesto de quem procura almoço no
 * Centro.
 *
 * A verificação é por mecanismo, e não por nome de arquivo: qualquer regra que
 * declare `will-change` precisa ter, no mesmo CSS, um estado final que o
 * devolva a `auto`.
 */
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Sem comentários: um `will-change` citado numa explicação não é um `will-change`. */
const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "");

describe("nenhuma camada de composição fica ligada para sempre", () => {
  it("todo will-change declarado tem um estado final que o desliga", () => {
    const declaracoes = [...semComentarios.matchAll(/will-change:\s*([^;]+);/g)].map(
      (m) => m[1].trim(),
    );

    // Sentinela: se a animação de revelação sair do CSS, este teste passaria
    // vazio e ninguém saberia que ele deixou de verificar algo.
    expect(
      declaracoes.length,
      "nenhum `will-change` no CSS — o teste perdeu o objeto",
    ).toBeGreaterThan(0);

    const ligados = declaracoes.filter((v) => v !== "auto");
    const desligados = declaracoes.filter((v) => v === "auto");

    expect(ligados.length).toBeGreaterThan(0);
    expect(
      desligados.length,
      `${ligados.length} regra(s) ligam will-change (${ligados.join(" | ")}) e ` +
        "nenhuma o devolve a `auto` no estado final",
    ).toBeGreaterThanOrEqual(1);
  });

  it("o estado revelado devolve o will-change", () => {
    // A regra específica, além do mecanismo geral acima: sem ela o teste
    // anterior poderia ser satisfeito por um `will-change: auto` em qualquer
    // outro lugar do arquivo.
    const reveladoVisivel = semComentarios.match(
      /\[data-reveal\]\[data-visible="true"\]\s*\{([^}]*)\}/,
    );
    expect(reveladoVisivel, "regra do estado revelado não encontrada").not.toBeNull();
    expect(reveladoVisivel![1]).toMatch(/will-change:\s*auto/);
  });
});
