import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

import { MenuHero } from "@/components/cardapio/menu-hero";
import { MenuPhoto } from "@/components/cardapio/menu-photo";
import { openingHoursLabel, siteConfig } from "@/config/site";
import { renderWithIntl, screen } from "./test-utils";

/**
 * A abertura do cardápio — duas peças desde 21/09/2026, e a divisão é o ponto.
 *
 * Quem chega em `/cardapio` pode ter escaneado um código na mesa e nunca ter
 * visto o site: o primeiro contato com a marca acontece aqui.
 *
 * ⚠️ **Era UMA peça de altura cheia até 21/09.** O dono pediu a estrutura do
 * projeto irmão, cujo spec de 14/09 decide em uma frase: *"a capa assina a
 * página; não ocupa a primeira dobra — comida vende, couro não."* Então:
 *
 * · `MenuHero` — faixa estreita, verde, com o nome. Assina e sai de cena;
 * · `MenuPhoto` — a fotografia, o horário e a ressalva. Ocupa a dobra.
 *
 * **Nenhuma asserção foi perdida na divisão**, e é por isso que este arquivo
 * ficou com dois `describe` em vez de um: o que era cobrado da peça única
 * continua cobrado, cada coisa da peça que passou a fazê-la. Testes que
 * desaparecem numa refatoração são o jeito silencioso de perder cobertura.
 *
 * ⚠️ **A foto entra por parâmetro, com a do módulo como padrão.** Lendo a
 * constante direto, este teste só conseguiria exercitar o estado de HOJE (com
 * foto), e o caminho sem imagem — para onde a página volta se alguém apagar o
 * arquivo — ficaria sem cobertura. Mesma decisão do `PriceCallout` e do
 * `PastaBuilder`, pelo mesmo motivo.
 */
describe("a capa que assina o cardápio", () => {
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

  it("usa a variante CLARA do nome, porque a faixa é verde", () => {
    // Sobre `brand`, o wordmark escuro desapareceria. E é o wordmark, não o
    // lockup: numa faixa desta altura o cozinheiro viraria borrão — medido em
    // 09/09, quando o ícone do navegador teve de virar só a cloche.
    const { container } = renderWithIntl(<MenuHero />);
    expect(
      container.querySelector('img[src*="wordmark-claro"]'),
    ).not.toBeNull();
  });

  it("não escreve nada sobre os blocos de destaque", () => {
    /*
     * ⚠️ A regra dura desta faixa, e ela tem número: `accent` dá **1,92:1** com
     * branco. Ele é fronteira, nunca superfície de texto — a mesma decisão que
     * o projeto irmão tomou sobre a curva laranja dele.
     *
     * A guarda cobra que os blocos sejam decoração DECLARADA: `aria-hidden` e
     * sem filho de texto. Se alguém puser um rótulo ali dentro, isto reprova
     * antes de a varredura de contraste ter de descobrir no pixel.
     */
    const { container } = renderWithIntl(<MenuHero />);
    const decoracao = container.querySelectorAll('[aria-hidden="true"]');
    expect(decoracao.length).toBeGreaterThan(0);
    for (const bloco of decoracao) {
      expect(bloco.textContent?.trim() ?? "").toBe("");
    }
  });

  it("é uma faixa, não uma dobra: nada de foto aqui", () => {
    // A metade que saiu. Se a foto voltar para cá, a capa volta a ocupar a
    // primeira dobra e a decisão do spec se desfaz sem ninguém dizer.
    const { container } = renderWithIntl(<MenuHero />);
    expect(container.querySelector('img[src*="hero"]')).toBeNull();
  });

  it("a marca não é o título da página", () => {
    // O `h1` é "Cardápio da semana", e nasce em `MenuSection` com `level={1}`.
    // A capa é identidade, não assunto — dois `h1` na mesma página é tão ruim
    // quanto nenhum.
    renderWithIntl(<MenuHero />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});

describe("a dobra de comida do cardápio", () => {
  it("desenha a foto de fundo quando existe, que é o estado de hoje", () => {
    const { container } = renderWithIntl(
      <MenuPhoto photo="/hero/churrasco-na-brasa.webp" />,
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
    // ⚠️ A busca exclui `brand` porque a marca também é imagem. Desde 21/09 ela
    // não vive mais nesta peça, mas a exclusão fica: ela custa nada e volta a
    // importar no dia em que alguém trouxer a marca para cá.
    const { container } = renderWithIntl(<MenuPhoto photo="" />);
    expect(container.querySelector('img[alt=""]:not([src*="brand"])')).toBeNull();
    expect(container.querySelector("[aria-hidden]")).not.toBeNull();
  });

  it("mostra o horário pelo ajudante, com os dias", () => {
    renderWithIntl(<MenuPhoto />);
    const rotulo = openingHoursLabel();
    if (rotulo === null) return; // sem horário configurado, nada a cobrar
    expect(screen.getByText(rotulo)).toBeInTheDocument();
    // A regra do projeto: a linha nunca sai sem os dias, senão manda o
    // visitante para a porta fechada no sábado.
    expect(rotulo).toMatch(/^(seg|ter|qua|qui|sex|s[áa]b|dom)/i);
  });

  it("também não abre um segundo `h1`", () => {
    renderWithIntl(<MenuPhoto />);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});
