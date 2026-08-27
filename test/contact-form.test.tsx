import { describe, it, expect, vi, beforeEach } from "vitest";
import { axe } from "vitest-axe";
import { renderWithIntl, screen, waitFor, userEvent } from "./test-utils";

// n8x uses Server Actions, not client fetch — mock the action module directly
// (no MSW). The component should call it with the typed payload + locale.
vi.mock("@/app/actions/leads", () => ({ submitContactLead: vi.fn() }));

import { submitContactLead } from "@/app/actions/leads";
import { ContactForm } from "@/components/forms/contact-form";

const mockSubmit = vi.mocked(submitContactLead);

beforeEach(() => {
  mockSubmit.mockReset();
});

describe("ContactForm", () => {
  it("keeps the honeypot out of the accessibility tree", () => {
    renderWithIntl(<ContactForm />);
    // Visible fields: name, email, phone, company, message (5). The honeypot is
    // aria-hidden, so it must NOT show up as an accessible textbox.
    expect(screen.getAllByRole("textbox")).toHaveLength(5);
  });

  it("blocks submission and flags invalid fields when empty", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ContactForm />);

    await user.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(screen.getAllByRole("textbox")[0]).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("submits valid data with the locale and shows the success state", async () => {
    mockSubmit.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderWithIntl(<ContactForm />);

    const [name, email, , , message] = screen.getAllByRole("textbox");
    await user.type(name, "Ana");
    await user.type(email, "ana@example.com");
    await user.type(message, "Olá, gostaria de saber mais sobre os serviços.");
    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ana",
        email: "ana@example.com",
        message: "Olá, gostaria de saber mais sobre os serviços.",
      }),
      "pt",
    );
    // O painel de confirmação, e não `getByRole("status")`: a região viva
    // agora existe DESDE SEMPRE, vazia, então perguntar por ela passaria verde
    // mesmo se o sucesso nunca aparecesse. Ver
    // `formulario-publico-anuncia-o-resultado.test.tsx`.
    expect(await screen.findByTestId("confirmacao-de-envio")).toBeInTheDocument();
  });

  /**
   * O visitante precisa saber quando a mensagem NAO saiu.
   *
   * O formulario ja mostrava o aviso quando a acao RESPONDE que nao deu. Faltava
   * o caso em que ela nao chega a responder — rede caida, servidor reiniciando,
   * o freio por IP recusando. Sem `try/catch`, `setStatus("error")` nunca roda: o
   * react-hook-form devolve `isSubmitting` a false no seu proprio `finally` e
   * RELANCA, entao o botao destrava e a tela nao muda em nada.
   *
   * Aqui o silencio custa mais caro que no painel. Quem esta do outro lado e um
   * cliente em potencial escrevendo para o restaurante: ele ve o botao voltar ao
   * normal, presume que enviou, e vai embora esperando resposta que nunca vem.
   * Ninguem no restaurante fica sabendo que existiu.
   *
   * A falha de transporte e simulada com a acao devolvendo `undefined` — ler
   * `.ok` de `undefined` lanca dentro do `try`, igual ao `await` de uma chamada
   * recusada, e sem deixar promessa rejeitada orfa em `mock.results`.
   */
  it("avisa o visitante quando o envio nao chega ao servidor", async () => {
    mockSubmit.mockResolvedValue(undefined as never);
    const user = userEvent.setup();
    renderWithIntl(<ContactForm />);

    const [name, email, , , message] = screen.getAllByRole("textbox");
    await user.type(name, "Ana");
    await user.type(email, "ana@example.com");
    await user.type(message, "Ola, gostaria de reservar uma mesa para amanha.");
    await user.click(screen.getByRole("button"));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    // A região viva continua no DOM (é o desenho), mas calada — e nenhuma
    // confirmação de envio aparece.
    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(screen.queryByTestId("confirmacao-de-envio")).toBeNull();
  });

  it("continua avisando quando a acao responde que nao deu", async () => {
    // Sentinela: o `catch` novo nao pode engolir o caminho que ja funcionava.
    mockSubmit.mockResolvedValue({ ok: false });
    const user = userEvent.setup();
    renderWithIntl(<ContactForm />);

    const [name, email, , , message] = screen.getAllByRole("textbox");
    await user.type(name, "Ana");
    await user.type(email, "ana@example.com");
    await user.type(message, "Ola, gostaria de reservar uma mesa para amanha.");
    await user.click(screen.getByRole("button"));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderWithIntl(<ContactForm />);
    const results = await axe(container);
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
