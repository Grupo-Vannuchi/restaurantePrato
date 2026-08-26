import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

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
 * Resultado de ação tem que ser ANUNCIADO, não só colorido.
 *
 * O painel devolvia o resultado em `<span>` e `<p>` mudos, inseridos no DOM
 * depois da ação. Para quem usa leitor de tela e não está com o cursor naquele
 * pedaço da tela, a ação simplesmente não produzia resposta — a única evidência
 * de falha era a cor, e cor não é informação para quem não a distingue.
 *
 * São sete lugares, e o mais grave era a configuração de notificação: a
 * confirmação de sucesso e o erro de salvamento dividiam o MESMO `<span>`,
 * escolhido por cor. Clicava em "Salvar", o botão voltava de "Salvando" para
 * "Salvar", e nada dizia qual dos dois tinha acontecido.
 *
 * O papel segue o significado: erro é `alert` (interrompe a leitura, porque
 * exige ação), sucesso e aviso são `status`. Anunciar sucesso como `alert`
 * seria tratar uma confirmação como emergência.
 */
const acao = vi.mocked(deleteGalleryPhoto);

beforeEach(() => {
  acao.mockReset();
  refresh.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("a falha de uma ação do painel", () => {
  it("é anunciada, não apenas pintada de vermelho", async () => {
    acao.mockResolvedValue({ ok: false });
    const user = userEvent.setup();
    renderWithIntl(<GalleryPhotoDeleteButton id="foto-1" />);

    await user.click(screen.getByRole("button", { name: /excluir/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Não foi possível excluir. Tente de novo.",
      );
    });
  });
});

describe("os componentes de resultado do painel", () => {
  // A guarda: enquanto der para escrever um <span className="text-red-500">
  // à mão, o próximo resultado volta a ser mudo. `StatusMessage` é a única
  // forma de mostrar resultado de ação, e ela escolhe o papel pelo tom.
  const PASTA = join(process.cwd(), "src", "components", "admin");

  const arquivos = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const caminho = join(dir, e.name);
      if (e.isDirectory()) return arquivos(caminho);
      return e.name.endsWith(".tsx") ? [caminho] : [];
    });

  // Só utilitário de cor APLICADO — `hover:text-red-600` num botão de excluir é
  // afordância de interação, não mensagem, e fica de fora.
  const CORES_CRUAS = /(?:^|\s)text-(?:red|emerald|amber)-\d{3}(?=\s|"|$)/;

  it("nenhum pinta resultado com cor crua do Tailwind", () => {
    const crus = arquivos(PASTA)
      .filter((c) => CORES_CRUAS.test(readFileSync(c, "utf8")))
      .map((c) => relative(process.cwd(), c).split(sep).join("/"));

    expect(crus).toEqual([]);
  });

  it("continua havendo componente de painel para varrer", () => {
    expect(arquivos(PASTA).length).toBeGreaterThan(10);
  });
});
