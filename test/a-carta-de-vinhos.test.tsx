import { describe, expect, it } from "vitest";

import { WineList } from "@/components/cardapio/wine-list";
import type { Wine } from "@/config/menu";
import { renderWithIntl, screen, within } from "./test-utils";

/**
 * A carta de vinhos.
 *
 * Ela segue o desenho das bebidas — nome à esquerda, preço à direita — mas tem
 * **um nível a mais**, e esse nível é a razão de a seção existir separada:
 * bebida é um nome para um preço; vinho é um rótulo para várias doses. Taça,
 * meia taça e garrafa são o mesmo vinho a preços diferentes.
 *
 * ⚠️ **É exatamente aí que mora o modo de errar.** Enfileirar "Del Grano taça"
 * e "Del Grano meia taça" como itens irmãos, no formato das bebidas, faria a
 * carta anunciar dois vinhos diferentes com nomes quase iguais — e quem lê na
 * mesa contaria seis rótulos onde existem dois. Nada quebraria: a página
 * desenha, os preços estão certos, e a informação está errada.
 *
 * Por isso o teste verifica a ESTRUTURA, não os textos: um bloco por rótulo, as
 * doses dentro dele. Um refator que achatasse a lista passaria por qualquer
 * asserção de conteúdo e cairia aqui.
 *
 * Os vinhos entram por parâmetro, como os adicionais da ilha e o aviso de
 * preço, pelo mesmo motivo de sempre: para os dois estados serem exercitáveis
 * hoje, e não só o que por acaso está configurado.
 */
const CARTA: readonly Wine[] = [
  {
    name: "Del Grano",
    note: "Nacional",
    servings: [
      { label: "Taça", volume: "175 ml", price: 17.5 },
      { label: "½ Taça", volume: "87,5 ml", price: 14.0 },
      { label: "Garrafa", price: 60.0 },
    ],
  },
  {
    name: "Block",
    note: "Importado",
    labels: ["Segredo do Abade", "Carménère"],
    servings: [
      { label: "Taça", volume: "175 ml", price: 19.5 },
      { label: "Garrafa", price: 75.0 },
    ],
  },
];

describe("a carta de vinhos", () => {
  it("agrupa as doses sob o rótulo, em vez de enfileirá-las como vinhos irmãos", () => {
    const { container } = renderWithIntl(<WineList wines={CARTA} />);

    // Dois rótulos, logo dois títulos de bloco — não cinco linhas soltas.
    const titulos = [...container.querySelectorAll("h3")].map((h) =>
      (h.textContent ?? "").trim(),
    );
    expect(titulos).toHaveLength(2);
    expect(titulos[0]).toContain("Del Grano");
    expect(titulos[1]).toContain("Block");

    // E as três doses do Del Grano vivem dentro do bloco dele.
    const listas = container.querySelectorAll("ul");
    expect(listas).toHaveLength(2);
    expect(within(listas[0] as HTMLElement).getAllByRole("listitem")).toHaveLength(3);
    expect(within(listas[1] as HTMLElement).getAllByRole("listitem")).toHaveLength(2);
  });

  it("mostra o preço de cada dose", () => {
    renderWithIntl(<WineList wines={CARTA} />);

    // U+00A0 entre "R$" e o número: é o que o Intl produz.
    expect(screen.getByText("R$ 17,50")).toBeInTheDocument();
    expect(screen.getByText("R$ 14,00")).toBeInTheDocument();
    expect(screen.getByText("R$ 60,00")).toBeInTheDocument();
  });

  it("lista os rótulos servidos sob a linha importada", () => {
    // O "Block" é uma linha com quatro rótulos por baixo, todos ao mesmo preço.
    // Sem eles, a carta diria "Importado" e não diria o que se está bebendo.
    renderWithIntl(<WineList wines={CARTA} />);

    expect(screen.getByText(/Segredo do Abade/)).toBeInTheDocument();
    expect(screen.getByText(/Carménère/)).toBeInTheDocument();
  });

  it("sem rótulo cadastrado, escreve a linha de apoio em vez de uma moldura vazia", () => {
    /*
     * Uma moldura de lista vazia leria como conteúdo que falhou ao carregar. A
     * frase diz que a carta existe e ainda não foi digitada, que é outra coisa
     * — e é a diferença entre "o site está quebrado" e "pergunte ao garçom".
     */
    const { container } = renderWithIntl(<WineList wines={[]} />);

    expect(container.querySelector("ul")).toBeNull();
    expect(container.textContent?.trim().length ?? 0).toBeGreaterThan(0);
  });
});
