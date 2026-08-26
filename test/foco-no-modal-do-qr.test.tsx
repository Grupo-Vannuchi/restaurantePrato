import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

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
  connectInstanceAction,
  connectionStateAction,
} from "@/app/actions/whatsapp";
import { WhatsappManager } from "@/components/admin/whatsapp-manager";
import { renderWithIntl, screen, userEvent, waitFor } from "./test-utils";

/**
 * O QR Code abre numa janela que não se declarava janela.
 *
 * O bloco do QR é um `<div className="fixed inset-0 …">` sobre a página inteira,
 * sem `role="dialog"`, sem `aria-modal` e sem gestão de foco. Para quem usa
 * leitor de tela, nada indica que algo se abriu: o conteúdo atrás continua
 * exposto e o cursor segue lá, na lista de instâncias escondida pelo véu.
 *
 * A consequência é pior que a do lightbox das novidades (corrigido em 21/08),
 * que ao menos se declarava diálogo: aqui **não existe saída pelo teclado**. O
 * botão de fechar está dentro do modal, o foco nunca entra nele, o Esc não faz
 * nada e clicar no fundo também não fecha. Quem navega sem mouse fica preso
 * numa tela que cobre tudo, com um QR Code que não consegue ler, e a única
 * saída é recarregar a página — o que derruba a conexão em andamento.
 *
 * Pior ainda: como nada torna o fundo inerte, a tabulação continua alcançando
 * os botões de trás. Dá para acionar "Excluir instância" através de um modal
 * que a pessoa nem sabe que está aberto.
 */
const listar = vi.mocked(listInstancesAction);
const conectar = vi.mocked(connectInstanceAction);
const estado = vi.mocked(connectionStateAction);

const DESCONECTADA = [
  { name: "VENDAS", state: "close", number: null, profileName: null },
];

beforeEach(() => {
  listar.mockReset();
  conectar.mockReset();
  estado.mockReset();

  listar.mockResolvedValue({ ok: true, data: DESCONECTADA } as never);
  conectar.mockResolvedValue({
    ok: true,
    data: { instance: "VENDAS", base64: "data:image/png;base64,AAA" },
  } as never);
  // A checagem periódica nunca conclui, para o modal não fechar sozinho.
  estado.mockResolvedValue({ ok: true, data: "connecting" } as never);
});

/** Abre o QR clicando em "Conectar" e devolve o botão que o abriu. */
async function abrirOQr() {
  const user = userEvent.setup();
  renderWithIntl(<WhatsappManager defaultInstance={null} />);
  await screen.findByText("VENDAS");

  const gatilho = screen.getByRole("button", { name: /Conectar/ });
  await user.click(gatilho);
  return { user, gatilho };
}

describe("a janela do QR Code", () => {
  it("se declara uma janela, com nome", async () => {
    await abrirOQr();

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveAccessibleName();
  });

  it("recebe o foco quando abre", async () => {
    await abrirOQr();

    const dialogo = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(dialogo.contains(document.activeElement)).toBe(true);
    });
  });

  it("fecha no Esc e devolve o foco a quem a abriu", async () => {
    const { user, gatilho } = await abrirOQr();
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(gatilho);
    });
  });

  it("não deixa a tabulação escapar para a página atrás", async () => {
    const { user } = await abrirOQr();
    const dialogo = await screen.findByRole("dialog");

    // Uma volta inteira: se houver fuga, o foco cai num botão da lista de trás.
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialogo.contains(document.activeElement)).toBe(true);
    }
  });

  it("descreve o QR em português, não numa string fixa em inglês", async () => {
    await abrirOQr();

    const imagem = await screen.findByRole("img");
    expect(imagem.getAttribute("alt")).not.toBe("QR code");
    expect(imagem.getAttribute("alt")).toBeTruthy();
  });
});

describe("toda janela modal do site", () => {
  // A guarda contra a divergência. Havia duas implementações de janela modal —
  // o lightbox das novidades e esta do QR — e só uma tinha gestão de foco. A
  // outra nem se declarava diálogo. Duas implementações divergem sempre: uma
  // recebe a correção, a outra fica para trás por meses sem ninguém notar.
  const raiz = join(process.cwd(), "src");

  const arquivos = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const caminho = join(dir, e.name);
      if (e.isDirectory()) return arquivos(caminho);
      return e.name.endsWith(".tsx") ? [caminho] : [];
    });

  const DECLARA_DIALOGO = /role=["']dialog["']/;

  const janelas = arquivos(raiz).filter((c) =>
    DECLARA_DIALOGO.test(readFileSync(c, "utf8")),
  );

  it("continua havendo janela modal para conferir", () => {
    expect(janelas.length).toBeGreaterThan(0);
  });

  it("toda janela que se declara diálogo usa o gancho de foco", () => {
    const semGancho = janelas
      .filter((c) => !readFileSync(c, "utf8").includes("useModalFocus"))
      .map((c) => relative(process.cwd(), c).split(sep).join("/"));

    expect(semGancho).toEqual([]);
  });
});
