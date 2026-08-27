import { describe, expect, it, vi } from "vitest";

// `next/navigation` não resolve no ambiente do Vitest e o `RichText` usa o
// `Link` do next-intl para os links do texto.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));


import { RichText } from "@/components/rich-text";
import { renderWithIntl, screen } from "./test-utils";

/**
 * O nível dos títulos do artigo vem de dado editável, e ninguém validava isso.
 *
 * `/novidades/[slug]` monta a página com `<h1>` (o título do artigo) e logo
 * abaixo o corpo, renderizado por `RichText`. O corpo é o que a pessoa digita
 * no painel: `## ` vira `<h2>` e `### ` vira `<h3>`. **Se o texto cadastrado
 * começar com `### `, a página sai com h1 → h3** — o leitor de tela anuncia um
 * nível que não existe, e quem navega por títulos perde a estrutura.
 *
 * Nem `npm run typecheck`, nem `npm run lint`, nem `npm run build` veem isso: o
 * defeito depende do conteúdo, não do código. E `e2e/a11y.spec.ts` cobre
 * `/novidades` (o índice), não `/novidades/[slug]`.
 *
 * A correção fica no renderizador, e não numa validação na hora de salvar, por
 * um motivo prático: quem escreve é o dono do restaurante, não um editor de
 * HTML. Recusar o texto dele por causa de um `#` a mais seria transferir um
 * problema nosso para ele. O renderizador rebaixa o nível para o próximo
 * degrau válido e a página sai correta, escreva ele o que escrever.
 */
function niveisRenderizados(): number[] {
  return screen
    .getAllByRole("heading")
    .map((h) => Number(h.tagName[1]));
}

describe("os títulos do corpo do artigo nunca pulam nível", () => {
  it("promove um ### solitário a h2, porque acima dele só existe o h1 da página", () => {
    renderWithIntl(<RichText blocks={["### Como chegar", "Fica no Centro."]} />);
    expect(niveisRenderizados()).toEqual([2]);
  });

  it("mantém a hierarquia quando o texto já vem certo", () => {
    // Sentinela: a correção não pode achatar tudo em h2.
    renderWithIntl(
      <RichText blocks={["## O buffet", "### Da brasa", "Fatiado na hora."]} />,
    );
    expect(niveisRenderizados()).toEqual([2, 3]);
  });

  it("volta a permitir h3 depois que um h2 abriu o caminho", () => {
    renderWithIntl(
      <RichText blocks={["### Primeiro", "## Segundo", "### Terceiro"]} />,
    );
    // O primeiro sobe para h2; o segundo é h2; o terceiro pode ser h3.
    expect(niveisRenderizados()).toEqual([2, 2, 3]);
  });

  it("aceita o nível do título que a página já colocou acima", () => {
    // Se algum dia o corpo for renderizado abaixo de um h2, o primeiro título
    // do texto pode ser h3 — e não deve ser rebaixado à força.
    renderWithIntl(<RichText blocks={["### Detalhe"]} nivelAcima={2} />);
    expect(niveisRenderizados()).toEqual([3]);
  });
});
