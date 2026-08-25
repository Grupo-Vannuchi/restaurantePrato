import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/whatsapp", () => ({ listInstancesAction: vi.fn() }));
vi.mock("@/app/actions/lead-notify", () => ({
  getLeadNotifyConfig: vi.fn(),
  saveLeadNotifyConfig: vi.fn(),
  listGroupsAction: vi.fn(),
}));

import { listInstancesAction } from "@/app/actions/whatsapp";
import {
  getLeadNotifyConfig,
  saveLeadNotifyConfig,
  listGroupsAction,
} from "@/app/actions/lead-notify";
import { LeadNotifyConfig } from "@/components/admin/lead-notify-config";
import { renderWithIntl, screen, userEvent, waitFor } from "./test-utils";

/**
 * Salvar a configuração de notificação não pode travar o botão.
 *
 * Este painel já protegia os DOIS carregamentos com `.catch()` — quem o escreveu
 * sabia que a Evolution cai. O que ficou de fora foi o salvar: sem `try/catch`,
 * a rejeição deixava `setSaving(false)` para trás e o botão ficava preso em
 * "Salvando…", sem aviso e sem forma de tentar de novo a não ser recarregar.
 *
 * É o mesmo defeito dos outros seis lugares, num componente que já estava meio
 * corrigido — o que é justamente o que torna esse tipo de buraco difícil de ver:
 * o arquivo *parece* cuidadoso.
 */
const carregarConfig = vi.mocked(getLeadNotifyConfig);
const salvar = vi.mocked(saveLeadNotifyConfig);
const listarGrupos = vi.mocked(listGroupsAction);
const listarInstancias = vi.mocked(listInstancesAction);

beforeEach(() => {
  carregarConfig.mockReset();
  salvar.mockReset();
  listarGrupos.mockReset();
  listarInstancias.mockReset();

  carregarConfig.mockResolvedValue({
    enabled: false,
    instance: "VENDAS",
    groupId: "g1",
    groupName: "Equipe",
  } as never);
  listarInstancias.mockResolvedValue({
    ok: true,
    data: [{ name: "VENDAS", state: "open", number: null, profileName: null }],
  } as never);
  listarGrupos.mockResolvedValue({
    ok: true,
    data: [{ id: "g1", name: "Equipe" }],
  } as never);
});

async function clicarEmSalvar() {
  const user = userEvent.setup();
  renderWithIntl(<LeadNotifyConfig />);
  const botao = await screen.findByRole("button", { name: /salvar/i });
  await user.click(botao);
  return botao;
}

describe("quando salvar a configuração não chega ao servidor", () => {
  it("avisa e libera o botão em vez de travar em Salvando…", async () => {
    salvar.mockResolvedValue(undefined as never);

    const botao = await clicarEmSalvar();

    await waitFor(() => {
      expect(
        screen.getByText("Não foi possível salvar. Tente de novo."),
      ).toBeInTheDocument();
    });
    expect(botao).not.toBeDisabled();
  });

  it("continua nomeando o erro que a própria ação devolve", async () => {
    // Sentinela: o `catch` novo não pode engolir o caminho que já funcionava.
    salvar.mockResolvedValue({ ok: false, error: "missing_target" } as never);

    await clicarEmSalvar();

    await waitFor(() => {
      expect(
        screen.getByText("Escolha uma instância e um grupo para ativar."),
      ).toBeInTheDocument();
    });
  });

  it("confirma quando dá certo — senão os testes acima passam por engano", async () => {
    salvar.mockResolvedValue({ ok: true } as never);

    await clicarEmSalvar();

    await waitFor(() => {
      expect(
        screen.queryByText("Não foi possível salvar. Tente de novo."),
      ).toBeNull();
    });
    expect(salvar).toHaveBeenCalledTimes(1);
  });
});
