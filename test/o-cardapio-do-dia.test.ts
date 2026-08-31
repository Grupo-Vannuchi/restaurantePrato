import { describe, expect, it } from "vitest";

import { pratosDoDia, agrupadosPorCategoria } from "@/lib/cardapio";

/**
 * Quais pratos saem em cada dia, e como eles chegam agrupados na tela.
 *
 * A regra central é a do prato permanente: **lista de dias vazia quer dizer
 * todos os dias**. O arroz, o feijão e a salada não são cadastrados cinco
 * vezes; são cadastrados uma vez, sem dia marcado, e aparecem em todas as abas.
 *
 * Isso importa para quem vai cadastrar, que é o dono do restaurante e não um
 * programador: sem essa regra ele precisaria repetir o arroz cinco vezes e
 * corrigir os cinco toda vez que mudasse a descrição.
 *
 * ⚠️ A regra é fácil de escrever ao contrário — `weekdays.includes(dia)`
 * sozinho esconde todo prato permanente, e a aba de segunda sai com o assado do
 * dia e mais nada. O teste existe para essa inversão não passar.
 */
const prato = (id: string, weekdays: number[], categoria = "buffet") => ({
  id,
  weekdays,
  category: { slug: categoria, name: categoria },
});

describe("os pratos de cada dia", () => {
  const arroz = prato("arroz", []);
  const assado = prato("assado", [1, 4]);
  const peixe = prato("peixe", [5]);
  const todos = [arroz, assado, peixe];

  it("o prato sem dia marcado sai em todos os dias", () => {
    for (const dia of [1, 2, 3, 4, 5]) {
      expect(pratosDoDia(todos, dia).map((p) => p.id)).toContain("arroz");
    }
  });

  it("o prato com dias sai só neles", () => {
    expect(pratosDoDia(todos, 1).map((p) => p.id)).toContain("assado");
    expect(pratosDoDia(todos, 4).map((p) => p.id)).toContain("assado");
    expect(pratosDoDia(todos, 2).map((p) => p.id)).not.toContain("assado");
  });

  it("não some com o permanente ao filtrar — a inversão fácil de escrever", () => {
    // Sentinela do erro exato: `weekdays.includes(dia)` sozinho deixaria a
    // segunda com o assado e mais nada.
    expect(pratosDoDia(todos, 1).map((p) => p.id)).toEqual(["arroz", "assado"]);
    expect(pratosDoDia(todos, 2).map((p) => p.id)).toEqual(["arroz"]);
  });

  it("preserva a ordem em que os pratos chegaram", () => {
    // A ordem vem do `order` do painel; reordenar aqui tiraria do restaurante o
    // controle sobre o que aparece primeiro.
    expect(pratosDoDia([peixe, arroz], 5).map((p) => p.id)).toEqual([
      "peixe",
      "arroz",
    ]);
  });

  it("um dia sem prato nenhum devolve lista vazia, e não quebra", () => {
    expect(pratosDoDia([assado], 3)).toEqual([]);
    expect(pratosDoDia([], 1)).toEqual([]);
  });
});

describe("o agrupamento por categoria", () => {
  it("junta os pratos da mesma categoria, na ordem em que ela apareceu", () => {
    const lista = [
      prato("arroz", [], "guarnicoes"),
      prato("assado", [], "carnes"),
      prato("farofa", [], "guarnicoes"),
    ];
    const grupos = agrupadosPorCategoria(lista);
    expect(grupos.map((g) => g.categoria.slug)).toEqual(["guarnicoes", "carnes"]);
    expect(grupos[0]!.pratos.map((p) => p.id)).toEqual(["arroz", "farofa"]);
    expect(grupos[1]!.pratos.map((p) => p.id)).toEqual(["assado"]);
  });

  it("uma lista vazia não vira um grupo vazio", () => {
    // Sem isto a tela desenharia um cabeçalho de categoria sem nada embaixo.
    expect(agrupadosPorCategoria([])).toEqual([]);
  });
});
