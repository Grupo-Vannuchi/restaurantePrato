import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/whatsapp", () => ({
  listInstancesAction: vi.fn(),
  createInstanceAction: vi.fn(),
  connectInstanceAction: vi.fn(),
  connectionStateAction: vi.fn(),
  logoutInstanceAction: vi.fn(),
  deleteInstanceAction: vi.fn(),
}));

import {
  listInstancesAction,
  deleteInstanceAction,
  logoutInstanceAction,
} from "@/app/actions/whatsapp";
import { WhatsappManager } from "@/components/admin/whatsapp-manager";
import { renderWithIntl, screen, userEvent, waitFor } from "./test-utils";

/**
 * O painel do WhatsApp fala com um servidor que cai de verdade.
 *
 * Todas as seis chamadas deste componente vão para a Evolution, que é externa e
 * fica fora do ar. Nenhuma tinha `try/catch`, e o estrago variava conforme a
 * chamada:
 *
 * - listar (na montagem e no "Atualizar") — a rejeição deixava `status` preso em
 *   `"loading"`, então o painel exibia o esqueleto animado **para sempre**. Quem
 *   olha conclui que está devagar, não que quebrou, e fica esperando.
 * - criar e conectar — `setBusy(null)` ficava para trás e o botão travava em
 *   "Criando…", sem forma de tentar de novo a não ser recarregar a página.
 * - desconectar e apagar — além disso, **ignoravam o resultado**: a lista
 *   recarregava, a instância continuava lá, e nada dizia por quê.
 * - a checagem de estado do QR roda a cada 3 segundos; uma rejeição ali virava
 *   rejeição não tratada em looping enquanto o QR estivesse aberto.
 *
 * O AGENTS.md tem regra para isto: "Integration state can go stale — detect and
 * surface it. Never fail silently in a way that mimics a different outcome." Um
 * esqueleto que gira para sempre é exatamente imitar um resultado diferente.
 */
const listar = vi.mocked(listInstancesAction);
const apagar = vi.mocked(deleteInstanceAction);
const desconectar = vi.mocked(logoutInstanceAction);

const UMA_INSTANCIA = [
  { name: "VENDAS", state: "open", number: "5513900000000", profileName: null },
];

beforeEach(() => {
  listar.mockReset();
  apagar.mockReset();
  desconectar.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("quando o servidor da Evolution não responde", () => {
  it("não deixa o painel girando para sempre ao carregar", async () => {
    listar.mockResolvedValue(undefined as never);

    renderWithIntl(<WhatsappManager defaultInstance={null} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Não foi possível carregar as instâncias. Tente atualizar.",
        ),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("Carregando instâncias…")).toBeNull();
  });

  it("avisa quando apagar a instância não dá certo", async () => {
    listar.mockResolvedValue({ ok: true, data: UMA_INSTANCIA } as never);
    apagar.mockResolvedValue(undefined as never);
    const user = userEvent.setup();

    renderWithIntl(<WhatsappManager defaultInstance={null} />);
    await screen.findByText("VENDAS");

    await user.click(screen.getByRole("button", { name: "Excluir" }));

    await waitFor(() => {
      expect(
        screen.getByText("Não foi possível apagar a instância. Tente de novo."),
      ).toBeInTheDocument();
    });
  });

  it("avisa quando desconectar não dá certo, e libera o botão", async () => {
    listar.mockResolvedValue({ ok: true, data: UMA_INSTANCIA } as never);
    desconectar.mockResolvedValue({ ok: false, error: "evolution_down" } as never);
    const user = userEvent.setup();

    renderWithIntl(<WhatsappManager defaultInstance={null} />);
    await screen.findByText("VENDAS");

    const botao = screen.getByRole("button", { name: /Desconectar/ });
    await user.click(botao);

    await waitFor(() => {
      expect(
        screen.getByText("Não foi possível desconectar. Tente de novo."),
      ).toBeInTheDocument();
    });
    expect(botao).not.toBeDisabled();
  });
});

describe("quando o servidor responde", () => {
  it("mostra a instância normalmente — senão os testes acima passam por engano", async () => {
    listar.mockResolvedValue({ ok: true, data: UMA_INSTANCIA } as never);

    renderWithIntl(<WhatsappManager defaultInstance={null} />);

    expect(await screen.findByText("VENDAS")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Não foi possível carregar as instâncias. Tente atualizar.",
      ),
    ).toBeNull();
  });
});
