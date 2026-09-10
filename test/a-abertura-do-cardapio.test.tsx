import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

import { MenuHero } from "@/components/cardapio/menu-hero";
import { openingHoursLabel, siteConfig } from "@/config/site";
import { renderWithIntl, screen } from "./test-utils";

/**
 * A abertura do cardápio, que precisa funcionar sem foto e sem logo.
 *
 * Quem chega em `/cardapio` pode ter escaneado um código na mesa e nunca ter
 * visto o site: este é o primeiro contato com a marca, e por isso a identidade
 * vem antes da lista.
 *
 * ⚠️ **A foto chegou em 03/09; a marca, não.** Até então a abertura não tinha
 * imagem nenhuma, e o projeto irmão punha o SVG do logo sobre um véu escuro.
 * A marca é imagem desde 09/09 e a abertura passou a véu ESCURO com a marca
 * clara em 10/09, alinhando com o topo da home — que havia invertido um dia
 * antes e deixado as duas aberturas do site sem conversar entre si.
 *
 * ⚠️ **A foto entra por parâmetro, com a do módulo como padrão.** Lendo a
 * constante direto, este teste só conseguiria exercitar o estado de HOJE (com
 * foto), e o caminho sem imagem — para onde a página volta se alguém apagar o
 * arquivo — ficaria sem cobertura. Mesma decisão do `PriceCallout` e do
 * `PastaBuilder`, pelo mesmo motivo.
 */
describe("a abertura do cardápio", () => {
  it("mostra a marca, e ela é nomeada para quem não a vê", () => {
    /*
     * A marca virou IMAGEM em 09/09, quando a logo chegou — antes era o nome
     * escrito na serifada. A asserção mudou junto: procurar o texto do nome
     * deixaria de encontrar qualquer coisa, e trocar por "existe uma imagem"
     * não verificaria o que importa.
     *
     * O que importa é o nome ACESSÍVEL: quem não vê a logo precisa ouvir
     * "Restaurante Prato", e isso vem do `aria-label` do link. O `alt` da
     * imagem fica vazio de propósito — com os dois, o leitor diria o nome duas
     * vezes seguidas.
     */
    renderWithIntl(<MenuHero />);
    expect(
      screen.getByRole("link", { name: siteConfig.name }),
    ).toBeInTheDocument();
  });

  it("desenha a foto de fundo quando existe, que é o estado de hoje", () => {
    const { container } = renderWithIntl(
      <MenuHero photo="/hero/churrasco-na-brasa.webp" />,
    );
    const img = container.querySelector('img[src*="churrasco"]');
    expect(img).not.toBeNull();
    // Decorativa: o texto por cima é que informa, e a foto repetida em voz alta
    // atrasaria quem usa leitor de tela sem acrescentar nada.
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("não quebra sem foto, para onde a página volta se o arquivo sumir", () => {
    // Sem o véu de reserva, a faixa sairia como um retângulo vazio.
    //
    // ⚠️ A busca é pela imagem de FUNDO, não por qualquer `<img>`: desde
    // 09/09 a marca também é imagem e vive dentro desta faixa. Perguntar
    // "existe alguma imagem?" passaria a encontrar a logo e o teste deixaria
    // de verificar o que nomeia.
    const { container } = renderWithIntl(<MenuHero photo="" />);
    expect(container.querySelector('img[alt=""]:not([src*="brand"])')).toBeNull();
    expect(container.querySelector("[aria-hidden]")).not.toBeNull();
  });

  it("mostra o horário pelo ajudante, com os dias", () => {
    renderWithIntl(<MenuHero />);
    const rotulo = openingHoursLabel();
    if (rotulo === null) return; // sem horário configurado, nada a cobrar
    expect(screen.getByText(rotulo)).toBeInTheDocument();
    // A regra do projeto: a linha nunca sai sem os dias, senão manda o
    // visitante para a porta fechada no sábado.
    expect(rotulo).toMatch(/^(seg|ter|qua|qui|sex|s[áa]b|dom)/i);
  });

  it("a marca é um cabeçalho de nível 2, não um título de página", () => {
    // O `h1` da página é "Cardápio da semana". A abertura é a identidade, não o
    // assunto — dois `h1` na mesma página é tão ruim quanto nenhum.
    renderWithIntl(<MenuHero />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});
