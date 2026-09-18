import { describe, expect, it } from "vitest";

import { secoesDoCardapio } from "@/lib/cardapio";

/**
 * O cardápio em dado estruturado: o que ele afirma, e o que ele se recusa a
 * afirmar.
 *
 * ⚠️ **A decisão que este teste guarda é a AUSÊNCIA do eixo de dia.** O banco
 * tem a união das duas semanas de buffet; emitir `hasMenuSection` por dia útil
 * afirmaria, para quem lê por máquina, que numa segunda-feira saem ~37 pratos.
 * Em tela isso é aceitável — a pessoa vê a aba do dia. Em dado estruturado é uma
 * afirmação sobre o serviço da casa naquele dia, e sem âncora de semana no banco
 * não há como emitir o dia certo.
 *
 * O caminho de volta é tentador e vai parecer uma melhoria: "o site já sabe o
 * dia, por que o schema não diz?". Diz não porque não sabe — sabe qual aba
 * mostrar, não qual das duas semanas está correndo.
 *
 * ⚠️ **E prato de buffet nunca leva preço.** O buffet é por peso; um preço por
 * prato seria afirmar ao Google um valor que a casa não cobra. O valor por quilo
 * vive no `priceRange` do `Restaurant`, que é onde ele é verdade.
 */
const rotulos = {
  massas: "Ilha de massas",
  sobremesas: "Sobremesas",
  bebidas: "Bebidas",
  vinhos: "Carta de vinhos",
};

/** Um prato de buffet mínimo. Nomes de fixture, nunca nome de comida real. */
const prato = (name: string, categoria: string, weekdays: number[] = []) => ({
  name,
  weekdays,
  category: { slug: categoria.toLowerCase(), name: categoria },
});

const vazio = {
  buffet: [],
  massas: [],
  rotulos,
  sobremesas: [],
  bebidas: [],
  vinhos: [],
};

describe("as seções do cardápio estruturado", () => {
  it("juntam os dias na mesma seção, em vez de uma seção por dia", () => {
    const secoes = secoesDoCardapio({
      ...vazio,
      buffet: [
        prato("Fixture de segunda", "Prateleira A", [1]),
        prato("Fixture de quinta", "Prateleira A", [4]),
        prato("Fixture permanente", "Prateleira A"),
      ],
    });

    // Uma seção, com os três — e não três seções de um.
    expect(secoes).toHaveLength(1);
    expect(secoes[0].name).toBe("Prateleira A");
    expect(secoes[0].items.map((i) => i.name)).toEqual([
      "Fixture de segunda",
      "Fixture de quinta",
      "Fixture permanente",
    ]);
  });

  it("não nomeiam nenhuma seção com dia da semana", () => {
    // A sentinela da decisão: se alguém acrescentar o eixo de dia, é aqui que
    // aparece, mesmo que a contagem acima continue passando.
    const secoes = secoesDoCardapio({
      ...vazio,
      buffet: [prato("Fixture de terça", "Prateleira A", [2])],
      massas: [prato("Fixture de massa", "Massas")],
      sobremesas: [{ name: "Fixture doce", price: 9 }],
    });

    const dias = /segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo/i;
    for (const secao of secoes) {
      expect(secao.name, `a seção "${secao.name}" nomeia um dia`).not.toMatch(dias);
    }
  });

  it("deixam o prato de buffet sem preço — ele é cobrado por peso", () => {
    const secoes = secoesDoCardapio({
      ...vazio,
      buffet: [prato("Fixture de buffet", "Prateleira A")],
    });

    expect(secoes[0].items[0].offers).toBeUndefined();
  });

  it("dão preço a sobremesa, bebida e vinho, que têm preço por item", () => {
    const secoes = secoesDoCardapio({
      ...vazio,
      sobremesas: [{ name: "Fixture doce", note: "220 g", price: 8 }],
      bebidas: [{ name: "Fixture de grupo", items: [{ name: "Fixture líquida", volume: "350 ml", price: 8.6 }] }],
      vinhos: [
        {
          name: "Fixture tinta",
          note: "Nacional",
          servings: [
            { label: "Taça", volume: "175 ml", price: 17.5 },
            { label: "Garrafa", price: 60 },
          ],
        },
      ],
    });

    const [doce, liquida, vinho] = secoes.map((s) => s.items[0]);
    expect(doce.offers).toEqual([{ price: 8 }]);
    expect(doce.description).toBe("220 g");
    expect(liquida.offers).toEqual([{ price: 8.6 }]);

    // Um vinho é UM item com várias doses: emitir "Fixture tinta Taça" e
    // "Fixture tinta Garrafa" como itens diferentes afirmaria dois vinhos com
    // nomes que ninguém usa para pedir.
    expect(vinho.offers).toEqual([
      { name: "Taça", price: 17.5 },
      { name: "Garrafa", price: 60 },
    ]);
  });

  it("omitem `offers` do item sem preço, em vez de publicar zero", () => {
    // O caso real: a Heineken está no quadro do salão e não tem etiqueta de
    // preço. Mesmo contrato de `precoDoBuffet()` e do `priceRange` — sem valor
    // configurado, o campo não sai. Um `price: 0` diria "de graça".
    const secoes = secoesDoCardapio({
      ...vazio,
      bebidas: [
        {
          name: "Fixture de grupo",
          items: [
            { name: "Fixture sem etiqueta", volume: "330 ml" },
            { name: "Fixture com etiqueta", price: 8.6 },
          ],
        },
      ],
    });

    const [sem, com] = secoes[0].items;
    expect(sem.offers).toBeUndefined();
    expect(com.offers).toEqual([{ price: 8.6 }]);
  });

  it("não inventam seção vazia quando uma lista não veio", () => {
    // Com o banco vazio e sem cardápio da casa, o certo é não declarar nada —
    // um `Menu` com seções vazias afirmaria que a casa não serve nada.
    expect(secoesDoCardapio(vazio)).toEqual([]);
  });

  it("mantêm a ordem da página: buffet, massas, sobremesas, bebidas, vinhos", () => {
    // Um cardápio é lido de cima a baixo, e o dado estruturado não deveria
    // contar outra ordem.
    const secoes = secoesDoCardapio({
      buffet: [prato("Fixture de buffet", "Prateleira A")],
      massas: [prato("Fixture de massa", "Massas")],
      rotulos,
      sobremesas: [{ name: "Fixture doce", price: 9 }],
      bebidas: [{ name: "Fixture de grupo", items: [{ name: "Fixture líquida", price: 5 }] }],
      vinhos: [{ name: "Fixture tinta", servings: [{ label: "Taça", price: 17 }] }],
    });

    expect(secoes.map((s) => s.name)).toEqual([
      "Prateleira A",
      rotulos.massas,
      rotulos.sobremesas,
      "Fixture de grupo",
      rotulos.vinhos,
    ]);
  });
});
