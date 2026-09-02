import { describe, expect, it } from "vitest";

import { PriceCallout } from "@/components/cardapio/price-callout";
import { renderWithIntl, screen } from "./test-utils";

/**
 * O aviso de preço não pode aparecer pela metade.
 *
 * Os dois valores ainda não vieram do cliente. Um aviso com o rótulo "Buffet por
 * quilo" seguido de nada é pior que aviso nenhum: quem lê na mesa entende que o
 * preço deveria estar ali e conclui que a página está quebrada.
 *
 * A regra, então, é por cartão: cada um aparece só se o SEU preço existir, e o
 * bloco inteiro some quando nenhum dos dois existe. É o mesmo desenho do
 * telefone (`contact.phone`) e do WhatsApp (`whatsappLink()`) neste projeto.
 *
 * ⚠️ O componente recebe os preços por parâmetro em vez de ler a configuração
 * direto. Não é preferência: lendo a configuração, este teste só conseguiria
 * exercitar o estado de HOJE (sem preço), e o caminho com preço ficaria sem
 * cobertura até o dia em que ele passasse a existir — que é justamente o dia em
 * que ninguém vai estar olhando.
 */
describe("o aviso de preço do cardápio", () => {
  it("some inteiro quando nenhum preço está configurado", () => {
    const { container } = renderWithIntl(
      <PriceCallout buffet={null} massa={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra os dois quando os dois existem", () => {
    renderWithIntl(<PriceCallout buffet="R$ 100,00/kg" massa="R$ 40,00" />);
    expect(screen.getByText("R$ 100,00/kg")).toBeInTheDocument();
    expect(screen.getByText("R$ 40,00")).toBeInTheDocument();
  });

  it("mostra só o que existe quando só um dos dois foi configurado", () => {
    // O cliente pode passar um preço antes do outro. O cartão sem valor não
    // pode aparecer com o rótulo sozinho.
    renderWithIntl(<PriceCallout buffet="R$ 100,00/kg" massa={null} />);
    expect(screen.getByText("R$ 100,00/kg")).toBeInTheDocument();
    expect(screen.queryByText(/ilha de massas/i)).toBeNull();
  });

  it("cada preço vem com o rótulo do que ele cobre", () => {
    // Dois números soltos lado a lado não dizem qual é qual, e são duas contas
    // diferentes: uma por peso, outra fechada.
    renderWithIntl(<PriceCallout buffet="R$ 100,00/kg" massa="R$ 40,00" />);
    expect(screen.getByText(/buffet por quilo/i)).toBeInTheDocument();
    expect(screen.getByText(/ilha de massas/i)).toBeInTheDocument();
  });
});
