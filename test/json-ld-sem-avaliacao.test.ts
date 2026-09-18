import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Depoimento nunca entra no dado estruturado — regra permanente.
 *
 * O Google proíbe *self-serving reviews*: emitir `Review` ou `aggregateRating`
 * sobre o próprio negócio, no próprio site. A punição não é o trecho perder as
 * estrelas — é o resultado rico sumir inteiro.
 *
 * A tentação volta sozinha, e é convincente: os depoimentos já estão na página,
 * já têm autor e fonte, e ligar um no outro parece "completar" o schema. Quem
 * chegar aqui daqui a seis meses não vai lembrar do motivo, e o código não
 * explica sozinho.
 *
 * A guarda forte é `e2e/structured-data.spec.ts`, que lê o que a página de fato
 * publica. Esta aqui é a rápida: roda em toda `npm test` e pega o import antes
 * mesmo de existir uma página para inspecionar.
 */
const FONTE = readFileSync(
  join(process.cwd(), "src", "components", "json-ld.tsx"),
  "utf8",
);

/**
 * O texto do arquivo SEM comentário — e é sobre ele que a proibição corre.
 *
 * ⚠️ **Em 18/09/2026 esta guarda reprovou a própria documentação.** O bloco
 * `Menu` entrou com um docblock que explica por que avaliação não pode entrar no
 * schema, e a varredura, que lia o arquivo inteiro, achou a palavra proibida na
 * frase que a proíbe. É a sexta guarda deste projeto a tropeçar na própria
 * documentação.
 *
 * O conserto não é reescrever o comentário: uma guarda que impede o arquivo de
 * NOMEAR a regra que ele cumpre obriga quem escreve a falar por rodeios, e aí a
 * próxima pessoa não encontra a explicação procurando pelo termo. Comentário
 * descreve o padrão; código é que o aplica. A proibição corre no código.
 *
 * ⚠️ **E o comentário de linha é removido pelo INÍCIO da linha, nunca por
 * ocorrência de `//`.** Este arquivo é cheio de `https://schema.org`, e cortar a
 * partir de qualquer `//` decapitaria cada uma dessas linhas — inclusive a que
 * declara `"@context"`, que é justamente o que a sentinela do fim confere. O
 * mesmo erro já custou uma depuração em `a-suite-mede-o-site-deste-cliente`,
 * onde o corte comia `http://localhost:${PORTA}`.
 *
 * Uma string no código continua valendo: só comentário sai.
 */
const CODIGO = FONTE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("o dado estruturado não fala de avaliações", () => {
  it("não declara as chaves que o Google proíbe aqui", () => {
    expect(CODIGO).not.toMatch(/aggregateRating/);
    expect(CODIGO).not.toMatch(/"@type":\s*"Review"/);
    expect(CODIGO).not.toMatch(/\breviewCount\b|\bratingValue\b/);
  });

  it("não busca depoimento nenhum", () => {
    // Se um dia este arquivo importar `getTestimonials`, é porque alguém está
    // a um passo de emitir o que não pode.
    expect(CODIGO).not.toMatch(/getTestimonials|TestimonialView/);
  });

  it("continua sendo o arquivo que monta o schema — senão a guarda não guarda", () => {
    expect(CODIGO).toMatch(/"@type":\s*"Restaurant"/);
  });
});
