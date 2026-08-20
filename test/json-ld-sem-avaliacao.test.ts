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

describe("o dado estruturado não fala de avaliações", () => {
  it("não declara as chaves que o Google proíbe aqui", () => {
    expect(FONTE).not.toMatch(/aggregateRating/);
    expect(FONTE).not.toMatch(/"@type":\s*"Review"/);
    expect(FONTE).not.toMatch(/\breviewCount\b|\bratingValue\b/);
  });

  it("não busca depoimento nenhum", () => {
    // Se um dia este arquivo importar `getTestimonials`, é porque alguém está
    // a um passo de emitir o que não pode.
    expect(FONTE).not.toMatch(/getTestimonials|TestimonialView/);
  });

  it("continua sendo o arquivo que monta o schema — senão a guarda não guarda", () => {
    expect(FONTE).toMatch(/"@type":\s*"Restaurant"/);
  });
});
