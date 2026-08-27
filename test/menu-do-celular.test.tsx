import { describe, expect, it, vi } from "vitest";

// `next/navigation` não resolve no ambiente do Vitest; o `Link` do next-intl é
// o que o cabeçalho usa e aqui basta que ele vire uma âncora de verdade, para
// as buscas por `role: "link"` funcionarem.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
}));


import { Header, PAINEL_DO_CELULAR } from "@/components/layout/header";
import { renderWithIntl, screen, userEvent, within } from "./test-utils";

/**
 * O botão que abre o submenu não pode se chamar igual ao link ao lado.
 *
 * No painel do celular, cada item com filhos rende dois controles vizinhos: o
 * link que navega para a seção e o botão que abre a lista. Os dois tinham o
 * mesmo nome acessível, então o leitor de tela anunciava "Nossa Gastronomia,
 * link" e logo em seguida "Nossa Gastronomia, botão, recolhido" — dois
 * controles indistinguíveis pelo nome, com destinos diferentes.
 *
 * ⚠️ Aqui, e não em `e2e/menu-do-celular.spec.ts`, por um motivo concreto: os
 * submenus vêm das categorias do cardápio, e o banco local do Prato está com o
 * schema aplicado e ZERO conteúdo — o cliente ainda não cadastrou nada pelo
 * painel. Um teste de navegador passaria sem submenu nenhum para inspecionar.
 * Com props injetadas a verificação é determinística.
 */
const CATEGORIAS = [
  { slug: "da-brasa", title: "Da brasa" },
  { slug: "sobremesas", title: "Sobremesas" },
];

/**
 * O painel é localizado pelo id, e não pelo nome do marco: no jsdom não há CSS,
 * então o `<nav>` do desktop e o do celular coexistem com o mesmo nome. No
 * navegador só um chega à árvore de acessibilidade, porque o outro está em
 * `display: none` — e é isso que `e2e/menu-do-celular.spec.ts` verifica.
 */
function painelDoCelular(): HTMLElement {
  const painel = document.getElementById(PAINEL_DO_CELULAR);
  expect(painel, "o painel do celular não abriu").not.toBeNull();
  // O marco precisa continuar sendo um `<nav>` com nome: era um `<div>` de
  // `<Link>` soltos, e quem navega por marcos perdia a navegação inteira.
  expect(painel!.tagName).toBe("NAV");
  expect(painel!).toHaveAttribute("aria-label", "Navegação principal");
  return painel!;
}

async function abrirMenuDoCelular() {
  const user = userEvent.setup();
  renderWithIntl(<Header serviceLinks={CATEGORIAS} />);
  await user.click(screen.getByRole("button", { name: "Abrir menu" }));
  return user;
}

describe("o painel do celular", () => {
  it("dá ao botão de submenu um nome diferente do link vizinho", async () => {
    await abrirMenuDoCelular();

    const painel = painelDoCelular();
    const botao = within(painel).getByRole("button", {
      name: "Abrir submenu de Nossa Gastronomia",
    });
    const link = within(painel).getByRole("link", { name: "Nossa Gastronomia" });

    expect(botao).toBeInTheDocument();
    expect(link).toBeInTheDocument();
    // Sentinela do defeito exato: se o rótulo voltar a ser o do item, os dois
    // controles voltam a ter o mesmo nome e esta busca acha dois resultados.
    expect(
      within(painel).queryAllByRole("button", { name: "Nossa Gastronomia" }),
    ).toHaveLength(0);
  });

  it("aponta o botão para a lista que ele abre", async () => {
    const user = await abrirMenuDoCelular();
    const painel = painelDoCelular();
    const botao = within(painel).getByRole("button", {
      name: "Abrir submenu de Nossa Gastronomia",
    });

    const alvo = botao.getAttribute("aria-controls");
    expect(alvo, "o botão de submenu não declara aria-controls").toBeTruthy();
    // Recolhido, a lista não existe — declarar relação com id inexistente seria
    // pior que nada. Ela precisa existir assim que o botão abre.
    await user.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(alvo!)).not.toBeNull();
  });

  it("lista as categorias do cardápio dentro do submenu", async () => {
    // Sentinela: sem isto, os dois testes acima continuariam passando se o
    // submenu deixasse de renderizar os links que justificam sua existência.
    const user = await abrirMenuDoCelular();
    const painel = painelDoCelular();
    await user.click(
      within(painel).getByRole("button", { name: "Abrir submenu de Nossa Gastronomia" }),
    );

    for (const categoria of CATEGORIAS) {
      expect(
        within(painel).getByRole("link", { name: categoria.title }),
      ).toHaveAttribute("href", expect.stringContaining(`#${categoria.slug}`));
    }
  });
});
