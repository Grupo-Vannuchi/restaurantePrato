import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/whatsapp", () => ({
  listInstancesAction: vi.fn(async () => ({ ok: true, data: [] })),
  createInstanceAction: vi.fn(),
  connectInstanceAction: vi.fn(),
  connectionStateAction: vi.fn(),
  logoutInstanceAction: vi.fn(),
  deleteInstanceAction: vi.fn(),
}));

import { WhatsappManager } from "@/components/admin/whatsapp-manager";
import { renderWithIntl, screen } from "./test-utils";

/**
 * Duas barreiras de teclado no painel, que o site público não tem.
 *
 * 1. SEM LINK DE PULAR. Quem navega por teclado atravessa nove elementos —
 *    logo, seis links de menu, o nome da pessoa e o botão de sair — antes de
 *    alcançar o conteúdo. Em toda página, a cada navegação.
 *
 *    O que torna isso um achado e não um esquecimento: o layout público TEM o
 *    link, com um comentário que descreve exatamente esse cálculo. O padrão
 *    existe no repositório e não tinha sido aplicado ao painel. WCAG 2.4.1 (A).
 *
 * 2. UM CAMPO SEM RÓTULO. O nome da nova instância do WhatsApp era o único
 *    input de todo o admin sem `<Label>`, sem `id` e sem `aria-label`. O nome
 *    acessível caía no `placeholder`, que vale "Ex: VENDAS" — o leitor anuncia
 *    "Ex: VENDAS, edição", um valor de exemplo no lugar do nome do campo. E o
 *    placeholder some ao digitar: quem tem baixa visão perde a única pista do
 *    que está preenchendo, sem forma de recuperá-la a não ser apagando tudo.
 *
 *    ⚠️ Isto NÃO seria pego por axe: a regra `label` aceita
 *    `non-empty-placeholder` como um dos seus checks. Um teste de axe passaria
 *    neste componente exatamente como estava.
 */
describe("o campo de nova instância", () => {
  it("tem nome próprio, e não o texto de exemplo", () => {
    renderWithIntl(<WhatsappManager defaultInstance={null} />);

    const campo = screen.getByRole("textbox", { name: /nome da instância/i });
    expect(campo).toBeInTheDocument();
    // O exemplo continua como dica de preenchimento, não como nome do campo.
    expect(campo).toHaveAttribute("placeholder", "Ex: VENDAS");
  });
});

describe("o painel administrativo", () => {
  const FONTE = readFileSync(
    join(process.cwd(), "src", "components", "admin", "admin-shell.tsx"),
    "utf8",
  );

  it("oferece o salto para o conteúdo, como o site público", () => {
    expect(FONTE).toMatch(/href="#conteudo"/);
    expect(FONTE).toMatch(/skipToContent/);
  });

  it("dá ao conteúdo um alvo que recebe o salto", () => {
    // `tabIndex={-1}` deixa o `<main>` receber foco por programa sem entrar na
    // ordem de tabulação — sem isso o link aponta para um alvo que não foca.
    expect(FONTE).toMatch(/<main[^>]*id="conteudo"/);
    expect(FONTE).toMatch(/<main[^>]*tabIndex=\{-1\}/);
  });

  it("continua sendo o arquivo que monta o painel — senão a guarda não guarda", () => {
    expect(FONTE).toMatch(/AdminNav/);
  });
});
