import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/queries", () => ({
  getInformations: vi.fn(),
}));

import { getInformations } from "@/lib/queries";
import { getHeaderLinks } from "@/lib/header-links";

/**
 * O site público não pode cair inteiro porque o banco de dados não respondeu.
 *
 * O layout de marketing buscava os itens do menu de navegação sem tratamento de
 * falha. Banco fora do ar → a busca lança → **todas as páginas do site
 * respondem erro 500**. Descoberto ao subir o servidor local sem o Docker
 * aberto, mas o mesmo vale em produção numa instabilidade do Supabase.
 *
 * O desproporcional é o ponto: endereço, horário, telefone e reservas por
 * WhatsApp **não vêm do banco** — estão no código. O banco fornece apenas os
 * links de novidades do menu do cabeçalho. Uma parte opcional derrubava o todo, e o
 * visitante que só queria saber onde fica o restaurante recebia página de erro.
 *
 * O `sitemap.xml` e o `llms.txt` já se protegiam disso desde sempre; o layout,
 * não.
 *
 * ⚠️ Degradar não é o mesmo que fingir que deu certo: a falha é registrada no
 * servidor. Sem isso, um banco intermitente sumiria com o menu de novidades por
 * dias sem ninguém notar.
 */
const novidades = vi.mocked(getInformations);

beforeEach(() => {
  novidades.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("quando o banco não responde", () => {
  it("o site continua de pé, sem os links que dependem dele", async () => {
    novidades.mockRejectedValue(new Error("Can't reach database server"));

    const links = await getHeaderLinks("pt");

    expect(links.informationLinks).toEqual([]);
  });

  it("registra a falha no servidor, em vez de engoli-la", async () => {
    novidades.mockRejectedValue(new Error("Can't reach database server"));

    await getHeaderLinks("pt");

    expect(console.error).toHaveBeenCalled();
  });
});

describe("quando o banco responde", () => {
  it("monta os links normalmente — senão o teste acima passa por engano", async () => {
    novidades.mockResolvedValue([
      { slug: "nota", title: "Nota", icon: "Info" },
    ] as never);

    const links = await getHeaderLinks("pt");

    expect(links.informationLinks).toEqual([
      { slug: "nota", title: "Nota", icon: "Info" },
    ]);
  });

  it("não registra erro no caminho feliz", async () => {
    novidades.mockResolvedValue([] as never);

    await getHeaderLinks("pt");

    expect(console.error).not.toHaveBeenCalled();
  });
});
