import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));
vi.mock("@/app/actions/admin", () => ({
  updateLeadStatus: vi.fn(),
  updateLeadTags: vi.fn(),
}));

import { updateLeadStatus, updateLeadTags } from "@/app/actions/admin";
import { LeadStatusButtons } from "@/components/admin/lead-status-buttons";
import { LeadTags } from "@/components/admin/lead-tags";
import { renderWithIntl, screen, userEvent, waitFor } from "./test-utils";

/**
 * Marcar e etiquetar um contato também precisa avisar quando não dá.
 *
 * Mesmo defeito dos botões de excluir e dos formulários, num terceiro lugar:
 * `startTransition(async () => { await acao(); router.refresh() })` **descarta o
 * retorno por construção**. Marcar um contato como atendido, arquivá-lo ou
 * colocar uma etiqueta falhava exatamente como funcionava — a lista recarregava,
 * o estado continuava o mesmo, e nada dizia por quê.
 *
 * Estes dois não foram pegos junto com os cinco de excluir porque não se chamam
 * `*-delete-button`. É o argumento a favor da varredura que fecha este arquivo:
 * ela procura o **mecanismo** (`startTransition` engolindo o resultado de uma
 * ação), não o nome do arquivo — e teria apontado os três desde o começo.
 */
const status = vi.mocked(updateLeadStatus);
const etiquetas = vi.mocked(updateLeadTags);
const MENSAGEM = "Não foi possível atualizar. Tente de novo.";

beforeEach(() => {
  status.mockReset();
  etiquetas.mockReset();
  refresh.mockReset();
});

async function marcarComoAtendido() {
  const user = userEvent.setup();
  renderWithIntl(<LeadStatusButtons id="lead-1" status="NEW" />);
  await user.click(screen.getByRole("button", { name: /respondido/i }));
}

describe("marcar o contato como atendido", () => {
  it("avisa quando a ação responde que não deu", async () => {
    status.mockResolvedValue({ ok: false });

    await marcarComoAtendido();

    await waitFor(() => expect(screen.getByText(MENSAGEM)).toBeInTheDocument());
  });

  it("avisa também quando a ação nem chega a responder", async () => {
    status.mockResolvedValue(undefined as never);

    await marcarComoAtendido();

    await waitFor(() => expect(screen.getByText(MENSAGEM)).toBeInTheDocument());
  });

  it("não encena sucesso: a lista não recarrega quando falha", async () => {
    status.mockResolvedValue({ ok: false });

    await marcarComoAtendido();

    await waitFor(() => expect(screen.getByText(MENSAGEM)).toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });

  it("recarrega a lista quando dá certo, sem mostrar erro", async () => {
    status.mockResolvedValue({ ok: true });

    await marcarComoAtendido();

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByText(MENSAGEM)).toBeNull();
  });
});

describe("etiquetar o contato", () => {
  it("avisa quando remover a etiqueta não dá certo", async () => {
    etiquetas.mockResolvedValue({ ok: false });
    const user = userEvent.setup();
    renderWithIntl(<LeadTags id="lead-1" tags={["almoço"]} />);

    await user.click(screen.getByRole("button", { name: /Remover tag/i }));

    await waitFor(() => expect(screen.getByText(MENSAGEM)).toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("o mecanismo que causava os três", () => {
  const PASTA = join(process.cwd(), "src", "components", "admin");

  /** Fonte sem comentários — o aviso que EXPLICA o defeito não é o defeito. */
  const codigo = (nome: string) =>
    readFileSync(join(PASTA, nome), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  const ARQUIVOS = readdirSync(PASTA).filter((n) => n.endsWith(".tsx"));

  it("continua havendo componentes de painel para varrer", () => {
    expect(ARQUIVOS.length).toBeGreaterThan(10);
  });

  it("nenhum componente do painel chama server action dentro de startTransition", () => {
    // `startTransition(async () => …)` não devolve o valor do callback a lugar
    // nenhum: qualquer `{ ok }` lido lá dentro morre ali, e uma rejeição sobe
    // para o error boundary em vez de virar mensagem. Se um dia houver uso
    // legítimo de transição no painel (uma que não chame ação), este teste
    // precisa de um recorte mais fino — não de uma exceção silenciosa.
    const infratores = ARQUIVOS.filter((nome) =>
      /startTransition\(\s*async/.test(codigo(nome)),
    );

    expect(infratores).toEqual([]);
  });
});
