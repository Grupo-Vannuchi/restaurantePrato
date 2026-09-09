import { describe, expect, it } from "vitest";

import { desserts, drinkGroups, formatBRL } from "@/config/menu";

/**
 * Sobremesa e bebida têm preço próprio — e é isso que as separa do resto.
 *
 * O buffet é cobrado por peso e a ilha de massas tem um valor fechado de seção:
 * nenhum prato dessas duas tem preço individual. Sobremesa e bebida têm, e são
 * cobradas à parte. Dizer que estão inclusas quando não estão é o tipo de erro
 * que o cliente descobre na conta.
 *
 * ⚠️ **O modo de falhar que este teste guarda é o preço ausente virar zero.**
 * `formatBRL(0)` devolve "R$ 0,00" — uma linha perfeitamente bem formatada
 * anunciando que a torta holandesa é de graça. Nada quebraria: o build passa, a
 * página desenha, e o erro só aparece no caixa. É o mesmo formato do defeito que
 * apareceu duas vezes nesta semana — a ausência da coisa com a aparência da
 * coisa funcionando.
 *
 * Por isso o preço é obrigatório no tipo E precisa ser maior que zero. Um item
 * cujo valor ainda não foi lido do quadro impresso **fica fora da lista**, com o
 * nome anotado no `PENDENTE` de `config/menu.ts` — não entra com zero, nem com
 * um palpite.
 */
describe("as bebidas", () => {
  const todas = drinkGroups.flatMap((g) => g.items);

  it("existe pelo menos um grupo, senão o resto do teste não verifica nada", () => {
    // Sentinela: com `drinkGroups` vazio todos os `every` abaixo passariam por
    // vacuidade, e a suíte diria que está tudo certo sobre uma lista que não
    // existe.
    expect(drinkGroups.length).toBeGreaterThan(0);
    expect(todas.length).toBeGreaterThan(0);
  });

  it("toda bebida tem preço maior que zero", () => {
    const semPreco = todas.filter((b) => !(b.price > 0)).map((b) => b.name);
    expect(semPreco, `sem preço: ${semPreco.join(", ")}`).toEqual([]);
  });

  it("nome e volume juntos identificam uma bebida só", () => {
    // A lista rende com `key={name-volume}`. Refrigerante de 200 ml e de 350 ml
    // são linhas diferentes e só o volume as separa: perder o volume de uma
    // delas faria o React tratar as duas como a mesma linha.
    const chaves = todas.map((b) => `${b.name}|${b.volume}`);
    expect(new Set(chaves).size, `chaves repetidas em: ${chaves.join(" · ")}`).toBe(
      chaves.length,
    );
  });
});

describe("as sobremesas", () => {
  it("toda sobremesa tem preço maior que zero", () => {
    // A lista está vazia enquanto os valores do quadro não forem legíveis, e
    // uma lista vazia passa aqui de propósito: o certo é a seção sumir, não
    // publicar sobremesa a R$ 0,00.
    const semPreco = desserts.filter((s) => !(s.price > 0)).map((s) => s.name);
    expect(semPreco, `sem preço: ${semPreco.join(", ")}`).toEqual([]);
  });

  it("cada sobremesa aparece uma vez só", () => {
    const nomes = desserts.map((s) => s.name);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});

describe("o formato do preço", () => {
  it("escreve em real brasileiro", () => {
    // O separador entre "R$" e o número é espaço NÃO SEPARÁVEL (U+00A0), não
    // espaço comum — o `Intl` usa esse. Escrito literal aqui porque um teste com
    // espaço comum falha exibindo duas cadeias visualmente idênticas.
    expect(formatBRL(8.6)).toBe("R$ 8,60");
    expect(formatBRL(10.8)).toBe("R$ 10,80");
  });

  it("zero vira 'R$ 0,00' — o motivo de preço zero ser barrado acima", () => {
    // Este teste não protege comportamento, documenta o perigo: a formatação
    // não tem como saber que o valor não deveria existir.
    expect(formatBRL(0)).toBe("R$ 0,00");
  });
});
