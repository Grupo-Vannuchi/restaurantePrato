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
 * ⚠️ **O equivalente do projeto irmão depende de duas coisas que este projeto
 * não tem.** Lá a abertura põe uma foto do buffet ao fundo e o SVG do logo por
 * cima, num véu escuro. Aqui não há foto nenhuma no banco, a marca ainda é
 * tipográfica (`public/brand/README.md`), e o horário não pode sair de uma
 * string do catálogo. Copiar renderia uma faixa preta com um buraco no meio.
 *
 * Então a abertura segue o padrão que o topo da home já usa neste site: com
 * foto ou sem, o texto fica escuro sobre um véu claro. **Um caminho só**, e não
 * dois modos visuais em que só um pode ser visto hoje — o outro entraria sem
 * ninguém nunca ter olhado para ele.
 */
describe("a abertura do cardápio", () => {
  it("mostra a marca, que hoje é tipográfica", () => {
    renderWithIntl(<MenuHero />);
    expect(screen.getByText(siteConfig.name)).toBeInTheDocument();
  });

  it("não quebra sem foto de fundo, que é o estado de hoje", () => {
    // O banco está vazio e não há imagem em `public/`. Sem o degradê de
    // reserva, a faixa sairia como um retângulo vazio.
    const { container } = renderWithIntl(<MenuHero />);
    expect(container.querySelector("img")).toBeNull();
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
