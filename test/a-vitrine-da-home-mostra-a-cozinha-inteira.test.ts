import { describe, expect, it } from "vitest";

import { pratosDaVitrine, VAGAS_DA_VITRINE } from "@/lib/menu-showcase";

/**
 * A vitrine da home mostrava um canto só da cozinha.
 *
 * Ela concatenava as categorias e cortava os primeiros: `categories.flatMap(c =>
 * c.items).slice(0, 8)`. Com uma categoria de oito pratos ou mais, os oito da
 * vitrine saíam TODOS dela — oito carnes na brasa e nenhuma sobremesa, oito
 * itens de buffet e nenhuma carne. A seção promete mostrar o que espera por
 * quem vem, e mostrava um canto só.
 *
 * Em rodadas, as vagas se distribuem sozinhas: um de cada categoria por vez até
 * fechar. E continuam se distribuindo quando o restaurante mexer no cardápio —
 * o que importa, porque o banco está vazio hoje e quem vai preenchê-lo é o
 * cliente, sem saber que existe uma regra de vitrine.
 *
 * A regra vive numa função pura, e não dentro do componente, porque o
 * componente é assíncrono de servidor e depende do banco: aqui ela é exercitada
 * com as listas que interessam, incluindo as que nunca aparecem no banco de
 * hoje.
 */
const prato = (nome: string) => ({ id: nome, name: nome });

const categoria = (prefixo: string, quantos: number) => ({
  items: Array.from({ length: quantos }, (_, i) => prato(`${prefixo}${i + 1}`)),
});

const nomes = (itens: { id: string }[]) => itens.map((i) => i.id);

describe("a escolha dos pratos da vitrine", () => {
  it("pega um de cada categoria por vez, e não os primeiros de uma só", () => {
    const escolhidos = pratosDaVitrine(
      [categoria("brasa", 10), categoria("buffet", 10), categoria("doce", 10)],
      9,
    );
    // Três rodadas completas: um de cada, três vezes.
    expect(nomes(escolhidos)).toEqual([
      "brasa1", "buffet1", "doce1",
      "brasa2", "buffet2", "doce2",
      "brasa3", "buffet3", "doce3",
    ]);
  });

  it("é isto que estava errado: uma categoria grande não toma a vitrine", () => {
    // Sentinela do defeito exato. Antes, `flatMap(...).slice(0, 8)` devolvia
    // oito "brasa" e nenhuma sobremesa.
    const escolhidos = pratosDaVitrine(
      [categoria("brasa", 20), categoria("doce", 3)],
      9,
    );
    expect(nomes(escolhidos).filter((n) => n.startsWith("doce"))).toHaveLength(3);
  });

  it("completa com quem tem mais quando uma categoria acaba", () => {
    // Sobremesas costumam ser poucas. Quando elas acabam, as vagas restantes
    // vão para quem ainda tem prato — a vitrine não fica com buracos.
    const escolhidos = pratosDaVitrine(
      [categoria("brasa", 8), categoria("doce", 1)],
      9,
    );
    expect(escolhidos).toHaveLength(9);
    expect(nomes(escolhidos)).toContain("doce1");
    expect(nomes(escolhidos).filter((n) => n.startsWith("brasa"))).toHaveLength(8);
  });

  it("devolve menos que as vagas quando o cardápio é curto, sem inventar nada", () => {
    const escolhidos = pratosDaVitrine([categoria("brasa", 2)], 9);
    expect(nomes(escolhidos)).toEqual(["brasa1", "brasa2"]);
  });

  it("não trava com cardápio vazio", () => {
    // O estado do banco HOJE. Sem a saída do laço, isto giraria para sempre.
    expect(pratosDaVitrine([], 9)).toEqual([]);
    expect(pratosDaVitrine([categoria("brasa", 0)], 9)).toEqual([]);
  });

  it("nunca passa das vagas", () => {
    const escolhidos = pratosDaVitrine(
      [categoria("a", 5), categoria("b", 5), categoria("c", 5), categoria("d", 5)],
      9,
    );
    expect(escolhidos).toHaveLength(9);
  });

  it("são nove vagas, e nove fecha a grade de três colunas", () => {
    // Oito deixavam a última linha pela metade, com um vão à direita que lê
    // como card faltando. O número é do desenho, não do acaso.
    expect(VAGAS_DA_VITRINE % 3).toBe(0);
    expect(VAGAS_DA_VITRINE).toBe(9);
  });
});
