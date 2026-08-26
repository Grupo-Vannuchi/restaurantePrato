import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));
vi.mock("@/app/actions/gallery", () => ({ deleteGalleryPhoto: vi.fn() }));

import { deleteGalleryPhoto } from "@/app/actions/gallery";
import { AdminNotice } from "@/components/admin/admin-notice";
import { GalleryPhotoDeleteButton } from "@/components/admin/gallery-photo-delete-button";
import { renderWithIntl, screen, userEvent, waitFor } from "./test-utils";

/**
 * Excluir com sucesso não podia ser indistinguível de não ter acontecido nada.
 *
 * No sucesso, `router.refresh()` recarrega a lista, o `<li>` some — e com ele o
 * botão que tinha o foco. O foco caía no `<body>`, jogando quem usa leitor de
 * tela para o topo do documento sem nenhuma pista. E **nada era anunciado**: o
 * caminho feliz produzia exatamente a mesma ausência de resposta que o fracasso
 * produzia até ontem.
 *
 * O nó do problema, e a razão do desenho: **quem anuncia não pode ser o botão**,
 * porque o botão é destruído junto com a linha que ele apagou. O aviso precisa
 * viver acima, num lugar que sobreviva à exclusão — e sobrevive porque
 * `router.refresh()` recarrega os componentes de servidor sem descartar o
 * estado dos de cliente.
 *
 * A região recebe o foco também. Mover foco é coisa a se fazer com parcimônia,
 * mas aqui o elemento que o tinha deixou de existir: a escolha não é entre
 * mover e não mover, é entre um destino pensado e o `<body>`.
 */
const acao = vi.mocked(deleteGalleryPhoto);

beforeEach(() => {
  acao.mockReset();
  refresh.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

async function excluir() {
  const user = userEvent.setup();
  renderWithIntl(
    <AdminNotice>
      <GalleryPhotoDeleteButton id="foto-1" />
    </AdminNotice>,
  );
  await user.click(screen.getByRole("button", { name: /excluir/i }));
}

describe("quando a exclusão dá certo", () => {
  it("anuncia o que aconteceu", async () => {
    acao.mockResolvedValue({ ok: true });

    await excluir();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Foto excluída.");
    });
  });

  it("leva o foco para o aviso, em vez de deixá-lo cair no corpo da página", async () => {
    acao.mockResolvedValue({ ok: true });

    await excluir();

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole("status"));
    });
    expect(document.activeElement).not.toBe(document.body);
  });

  it("continua recarregando a lista", async () => {
    acao.mockResolvedValue({ ok: true });

    await excluir();

    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});

describe("quando a exclusão falha", () => {
  it("não anuncia sucesso nenhum", async () => {
    acao.mockResolvedValue({ ok: false });

    await excluir();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Não foi possível excluir. Tente de novo.",
      );
    });
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });
});

describe("a região de aviso", () => {
  it("existe no DOM antes de ter mensagem", () => {
    // Uma região viva só é anunciada de forma confiável se já estiver no DOM
    // quando o texto muda. Criá-la junto com a mensagem faz leitores de tela
    // perderem o anúncio.
    renderWithIntl(<AdminNotice>conteúdo</AdminNotice>);

    const regiao = screen.getByRole("status");
    expect(regiao).toBeInTheDocument();
    expect(regiao).toBeEmptyDOMElement();
    expect(regiao).toHaveAttribute("aria-live", "polite");
  });
});
