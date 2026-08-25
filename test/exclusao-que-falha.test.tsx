import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));
vi.mock("@/app/actions/gallery", () => ({ deleteGalleryPhoto: vi.fn() }));

import { deleteGalleryPhoto } from "@/app/actions/gallery";
import { GalleryPhotoDeleteButton } from "@/components/admin/gallery-photo-delete-button";
import { renderWithIntl, screen, userEvent, waitFor } from "./test-utils";

/**
 * Exclusão que falha tem que aparecer na tela.
 *
 * Os cinco botões de excluir do painel mandavam apagar e **não olhavam a
 * resposta**: `startTransition(async () => { await deleteX(id); router.refresh() })`
 * descarta o retorno da ação por construção. Quando a exclusão falhava — sessão
 * expirada, erro do banco —, a lista recarregava, o item continuava lá e nenhuma
 * mensagem aparecia. O caminho natural de quem usa é clicar de novo, e de novo.
 *
 * Pior que o silêncio: `router.refresh()` rodava mesmo no fracasso, então a tela
 * se comportava exatamente como no sucesso. Não é ausência de aviso, é um aviso
 * ERRADO — a interface encenava que tinha funcionado.
 *
 * Há ainda o caso em que a ação nem responde (rede caída, servidor reiniciando).
 * Dentro de `startTransition` a rejeição não é capturada por nada e borbulha
 * para o error boundary, derrubando a tela inteira em vez de virar uma linha
 * vermelha ao lado do botão.
 *
 * Como em `test/upload-que-falha.test.tsx`, a falha de transporte é simulada com
 * a ação devolvendo `undefined` — ler `.ok` de `undefined` lança dentro do
 * `try`, igual ao `await` de uma chamada recusada. `mockRejectedValue` deixaria
 * uma promessa rejeitada em `mock.results` sem consumidor e o Vitest reprovaria
 * o teste por rejeição não tratada, mesmo com as asserções passando.
 */
const acao = vi.mocked(deleteGalleryPhoto);
const MENSAGEM_DE_FALHA = "Não foi possível excluir. Tente de novo.";

beforeEach(() => {
  acao.mockReset();
  refresh.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

async function clicarEmExcluir() {
  const user = userEvent.setup();
  renderWithIntl(<GalleryPhotoDeleteButton id="foto-1" />);
  await user.click(screen.getByRole("button", { name: /excluir/i }));
}

describe("quando a exclusão falha", () => {
  it("avisa que não deu, quando a ação responde que não deu", async () => {
    acao.mockResolvedValue({ ok: false });

    await clicarEmExcluir();

    await waitFor(() => {
      expect(screen.getByText(MENSAGEM_DE_FALHA)).toBeInTheDocument();
    });
  });

  it("não encena sucesso: a lista não é recarregada quando a exclusão falha", async () => {
    acao.mockResolvedValue({ ok: false });

    await clicarEmExcluir();

    await waitFor(() => expect(screen.getByText(MENSAGEM_DE_FALHA)).toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });

  it("avisa também quando a ação nem chega a responder", async () => {
    acao.mockResolvedValue(undefined as never);

    await clicarEmExcluir();

    await waitFor(() => {
      expect(screen.getByText(MENSAGEM_DE_FALHA)).toBeInTheDocument();
    });
  });

  it("libera o botão para uma nova tentativa", async () => {
    acao.mockResolvedValue({ ok: false });

    await clicarEmExcluir();

    await waitFor(() => expect(screen.getByText(MENSAGEM_DE_FALHA)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /excluir/i })).not.toBeDisabled();
  });
});

describe("quando a exclusão dá certo", () => {
  it("recarrega a lista e não mostra erro nenhum", async () => {
    acao.mockResolvedValue({ ok: true });

    await clicarEmExcluir();

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.queryByText(MENSAGEM_DE_FALHA)).toBeNull();
  });

  it("não apaga nada se a pessoa cancelar a confirmação", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    await clicarEmExcluir();

    expect(acao).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("os cinco botões de excluir", () => {
  // A guarda que impede a divergência de voltar: os cinco eram cópias byte a
  // byte, e corrigir cinco vezes é convidar o defeito a reaparecer só em um.
  const PASTA = join(process.cwd(), "src", "components", "admin");
  const BOTOES = readdirSync(PASTA).filter((n) => n.endsWith("-delete-button.tsx"));

  it("continuam sendo cinco — senão a guarda não guarda", () => {
    expect(BOTOES).toHaveLength(5);
  });

  it("todos passam pela mesma base, nenhum trata exclusão por conta própria", () => {
    const foraDaBase = BOTOES.filter((nome) => {
      const fonte = readFileSync(join(PASTA, nome), "utf8");
      return !/DeleteButtonBase/.test(fonte) || /startTransition/.test(fonte);
    });

    expect(foraDaBase).toEqual([]);
  });
});
