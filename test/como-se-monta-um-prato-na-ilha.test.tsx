import { describe, expect, it } from "vitest";

import { PastaBuilder } from "@/components/cardapio/pasta-builder";
import { pastaChoices } from "@/config/menu";
import { renderWithIntl, screen, within } from "./test-utils";

/**
 * Como se monta um prato na ilha de massas.
 *
 * A seção existia e nunca aparecia: ela dependia de haver massa cadastrada no
 * banco, e o banco está vazio. Um visitante lendo o cardápio hoje não descobre
 * que a ilha existe — o que é justamente a informação que faz alguém atravessar
 * o salão até ela. Agora o passo a passo vem do cardápio da casa, que é código,
 * e não de registro cadastrado.
 *
 * ⚠️ **Os adicionais entram por parâmetro, e não lidos da configuração.** Não é
 * preferência: lendo a configuração, este teste só exercitaria o estado de HOJE
 * (sem preço), e o caminho COM preço ficaria sem cobertura até o dia em que os
 * valores chegarem — que é exatamente o dia em que ninguém vai estar olhando.
 * Mesma decisão do `PriceCallout`, pelo mesmo motivo.
 */
const COM_PRECO = [
  { name: "Filé de frango", weight: "110 gramas", price: 7.5 },
  { name: "Bife de alcatra", weight: "120 gramas", price: 9.5 },
];

describe("o passo a passo da ilha de massas", () => {
  it("aparece mesmo sem nenhuma massa cadastrada no banco", () => {
    // O ponto da mudança: o conteúdo vem do cardápio da casa, não do banco.
    renderWithIntl(<PastaBuilder extras={[]} photos={[]} />);

    expect(screen.getByText(pastaChoices.shapes[0]!)).toBeInTheDocument();
    expect(
      screen.getByText(pastaChoices.sauces[pastaChoices.sauces.length - 1]!),
    ).toBeInTheDocument();
  });

  it("lista todos os formatos e todos os molhos", () => {
    renderWithIntl(<PastaBuilder extras={[]} photos={[]} />);

    for (const forma of pastaChoices.shapes) {
      expect(screen.getByText(forma)).toBeInTheDocument();
    }
    for (const molho of pastaChoices.sauces) {
      expect(screen.getByText(molho)).toBeInTheDocument();
    }
  });

  it("diz QUANTOS ingredientes, nunca QUAIS", () => {
    /*
     * A regra vem do cardápio impresso e existe por uma razão de cozinha: os
     * ingredientes mudam toda semana, conforme o que chega. Uma lista publicada
     * vira promessa que a cozinha não cumpre num dia de entrega ruim.
     *
     * A verificação é estrutural, não textual: os passos com escolha rendem uma
     * lista; o de ingredientes rende um parágrafo. Se alguém "completar" a seção
     * com os nomes, nasce uma quarta lista e este teste cai.
     */
    renderWithIntl(<PastaBuilder extras={[]} photos={[]} />);

    const passos = screen.getAllByRole("listitem");
    const comLista = passos.filter((p) => within(p).queryAllByRole("list").length > 0);

    expect(comLista).toHaveLength(3); // massa, preparo, molho — ingredientes não
    expect(screen.getByText(new RegExp(String(pastaChoices.ingredientLimit)))).toBeInTheDocument();
  });

  it("mantém a ordem em que o cliente escolhe, de pé na frente do cozinheiro", () => {
    // A ordem é a informação: massa, depois preparo, depois molho, depois os
    // ingredientes. Embaralhada, a seção deixa de descrever o serviço.
    const { container } = renderWithIntl(<PastaBuilder extras={[]} photos={[]} />);
    const titulos = [...container.querySelectorAll("h4")].map((h) =>
      (h.textContent ?? "").replace(/^\d+/, "").trim(),
    );

    expect(titulos).toEqual(["Escolha sua massa", "Método de preparo", "Escolha seu molho", "Escolha seus ingredientes"]);
  });
});

describe("as fotos da ilha", () => {
  const FOTOS = [
    { photo: "/massas/fettuccine-ao-pesto.webp", name: "Fettuccine ao pesto" },
    { photo: "/massas/nhoque-ao-sugo.webp", name: "Nhoque ao sugo" },
  ];

  it("cada foto tem texto alternativo que a distingue das outras", () => {
    /*
     * Três fotos de massa lidas como "Foto do prato, Foto do prato, Foto do
     * prato" descrevem uma massa só repetida. O nome é o que separa uma da
     * outra para quem usa leitor de tela, e é o mesmo motivo pelo qual as
     * fotos escolhidas são de massas visivelmente diferentes entre si.
     */
    renderWithIntl(<PastaBuilder extras={[]} photos={FOTOS} />);

    const alts = screen.getAllByRole("img").map((i) => i.getAttribute("alt"));
    expect(alts).toHaveLength(2);
    expect(new Set(alts).size).toBe(2);
    expect(alts[0]).toMatch(/Fettuccine ao pesto/);
  });

  it("sem foto, a seção não reserva espaço vazio", () => {
    // O estado em que a seção nasceu, e que volta se alguém apagar os arquivos.
    renderWithIntl(<PastaBuilder extras={[]} photos={[]} />);

    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });
});

describe("os adicionais da ilha", () => {
  it("somem inteiros enquanto não têm preço", () => {
    /*
     * Adicional é cobrado por unidade — é a exceção à regra de que o preço é da
     * seção. Sem valor, a linha "Filé de frango" no meio de um cardápio lê como
     * incluso, e o cliente descobre o contrário na conta. Mesma decisão das
     * sobremesas: fora da lista, não dentro com zero.
     */
    renderWithIntl(<PastaBuilder extras={[]} photos={[]} />);

    expect(screen.queryByText("Adicione uma proteína")).not.toBeInTheDocument();
    expect(screen.queryByText("Filé de frango")).not.toBeInTheDocument();
  });

  it("aparecem com o preço na linha quando os valores existirem", () => {
    // O caminho que ainda não existe em produção. Sem este teste ele estrearia
    // sem nunca ter rodado.
    renderWithIntl(<PastaBuilder extras={COM_PRECO} photos={[]} />);

    expect(screen.getByText("Adicione uma proteína")).toBeInTheDocument();
    expect(screen.getByText("Filé de frango")).toBeInTheDocument();
    // U+00A0 entre "R$" e o número: é o que o Intl produz.
    expect(screen.getByText("R$ 7,50")).toBeInTheDocument();
    expect(screen.getByText("R$ 9,50")).toBeInTheDocument();
  });
});
