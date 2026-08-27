import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/leads", () => ({ submitContactLead: vi.fn() }));

import { submitContactLead } from "@/app/actions/leads";
import { ContactForm } from "@/components/forms/contact-form";
import { renderWithIntl, screen, userEvent, waitFor } from "./test-utils";

/**
 * O formulário público não anunciava o resultado — e as regras certas já
 * estavam escritas, do outro lado da casa.
 *
 * `admin-notice.tsx` e `status-message.tsx` documentam, desde 26/08, que uma
 * região viva só é anunciada de forma confiável se já estiver no DOM quando o
 * texto muda, e que mover o foco não é uma escolha quando o elemento que o
 * tinha deixou de existir — a escolha é entre um destino pensado e o `<body>`.
 * Nada disso tinha chegado ao formulário de contato, que é justamente onde o
 * visitante fala com o restaurante.
 *
 * Três defeitos, um por vez:
 *
 * 1. **A confirmação nascia junto com a região.** O `<form>` inteiro era
 *    desmontado e um `<div role="status">` era inserido no mesmo commit de
 *    render. O antipadrão exato que o painel já tinha corrigido.
 * 2. **O foco caía no `<body>`.** O foco estava no botão de enviar, e o botão
 *    ia embora com o formulário.
 * 3. **`disabled={isSubmitting}` custava o foco antes disso.** No Chrome,
 *    desabilitar o elemento focado joga o foco no `<body>` — e a troca de nome
 *    de um elemento desabilitado não é anunciada, então "Enviando…" existia só
 *    para quem enxerga.
 *
 * O teste antigo (`contact-form.test.tsx`) verificava presença: `findByRole
 * ("status")` encontrava o painel e passava verde com os três defeitos no ar.
 */
const acao = vi.mocked(submitContactLead);

beforeEach(() => {
  acao.mockReset();
});

async function preencher() {
  const user = userEvent.setup();
  renderWithIntl(<ContactForm />);
  const [nome, email, , , mensagem] = screen.getAllByRole("textbox");
  await user.type(nome, "Ana");
  await user.type(email, "ana@example.com");
  await user.type(mensagem, "Olá, gostaria de reservar uma mesa para amanhã.");
  return user;
}

describe("o formulário de contato anuncia o que aconteceu", () => {
  it("mantém a região viva no DOM desde antes do envio, e vazia", () => {
    renderWithIntl(<ContactForm />);
    const regiao = screen.getByRole("status");
    expect(regiao).toBeInTheDocument();
    // Vazia: uma região que já nasce com texto não anuncia nada, e uma que
    // ocupa espaço visual desenha uma caixa fantasma na página.
    expect(regiao).toHaveTextContent("");
  });

  it("leva o foco para a confirmação quando o envio dá certo", async () => {
    acao.mockResolvedValue({ ok: true });
    const user = await preencher();
    await user.click(screen.getByRole("button"));

    const confirmacao = await screen.findByTestId("confirmacao-de-envio");
    await waitFor(() => expect(confirmacao).toHaveFocus());
    // Sentinela: se o foco tivesse ido para o `<body>`, o `toHaveFocus` acima
    // falharia — mas um painel sem `tabIndex` também nunca receberia foco, e
    // aí o teste falharia por motivo errado. Este par distingue os dois casos.
    expect(confirmacao).toHaveAttribute("tabindex", "-1");
  });

  it("anuncia o progresso sem desabilitar o botão que tem o foco", async () => {
    let liberar!: (v: { ok: boolean }) => void;
    acao.mockReturnValue(
      new Promise<{ ok: boolean }>((res) => {
        liberar = res;
      }) as ReturnType<typeof submitContactLead>,
    );

    const user = await preencher();
    const botao = screen.getByRole("button");
    await user.click(botao);

    await waitFor(() => expect(screen.getByRole("status")).not.toHaveTextContent(""));
    // `disabled` tira o elemento da árvore de foco; `aria-disabled` não.
    expect(botao).not.toBeDisabled();
    expect(botao).toHaveAttribute("aria-disabled", "true");
    expect(botao.closest("form")).toHaveAttribute("aria-busy", "true");

    liberar({ ok: true });
    await screen.findByTestId("confirmacao-de-envio");
  });

  it("não envia duas vezes quando o botão é clicado durante o envio", async () => {
    // A contrapartida de trocar `disabled` por `aria-disabled`: o clique ainda
    // chega. Sem guarda, o visitante gera dois leads iguais.
    let liberar!: (v: { ok: boolean }) => void;
    acao.mockReturnValue(
      new Promise<{ ok: boolean }>((res) => {
        liberar = res;
      }) as ReturnType<typeof submitContactLead>,
    );

    const user = await preencher();
    const botao = screen.getByRole("button");
    await user.click(botao);
    await waitFor(() => expect(acao).toHaveBeenCalledTimes(1));
    await user.click(botao);
    await user.click(botao);

    expect(acao).toHaveBeenCalledTimes(1);
    liberar({ ok: true });
    await screen.findByTestId("confirmacao-de-envio");
  });
});
