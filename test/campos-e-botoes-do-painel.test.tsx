import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/app/actions/admin", () => ({
  updateLeadStatus: vi.fn(),
  updateLeadTags: vi.fn(),
}));

import { LeadTags } from "@/components/admin/lead-tags";
import { renderWithIntl, screen } from "./test-utils";

/**
 * O que sobrou: um campo sem nome, um formulário fora do padrão e um estado
 * de carregamento que ninguém anuncia.
 */

describe("o campo de nova etiqueta", () => {
  /**
   * Ele tinha o MESMO nome acessível do botão ao lado — os dois usavam a chave
   * `addTag`, "Adicionar tag". O leitor anunciava "Adicionar tag, edição" e logo
   * depois "Adicionar tag, botão": dois controles vizinhos indistinguíveis.
   *
   * E o nome vinha do `placeholder`, que some ao digitar. É o mesmo defeito que
   * o commit de hoje de manhã corrigiu no campo de nova instância do WhatsApp —
   * este ficou de fora porque está noutro arquivo.
   */
  it("tem nome próprio, diferente do botão que o acompanha", () => {
    renderWithIntl(<LeadTags id="lead-1" tags={[]} />);

    const campo = screen.getByRole("textbox");
    const botao = screen.getByRole("button", { name: /adicionar/i });

    expect(campo).toHaveAccessibleName();
    expect(campo.getAttribute("aria-label")).not.toBe(
      botao.getAttribute("aria-label"),
    );
  });
});

describe("o formulário de login", () => {
  const FONTE = readFileSync(
    join(process.cwd(), "src", "components", "admin", "login-form.tsx"),
    "utf8",
  );

  it("desliga a validação nativa, como os outros seis", () => {
    // Sem `noValidate`, os `required` disparam o balão do navegador: transitório,
    // não traduzível, e lido de forma inconsistente. Todos os outros formulários
    // do site já validam em JS com mensagem própria; este era o único de fora.
    expect(FONTE).toMatch(/noValidate/);
  });

  it("liga a mensagem de erro aos campos", () => {
    // O erro de credencial não pertence a um campo só — vale para os dois —,
    // então os dois o referenciam por `aria-describedby`. Sem isso, quem tabula
    // até o campo depois da recusa não ouve por que foi recusado.
    expect(FONTE).toMatch(/aria-describedby=/);
    expect(FONTE).toMatch(/id="erro-login"/);
  });
});

describe("o painel de notificação", () => {
  const FONTE = readFileSync(
    join(process.cwd(), "src", "components", "admin", "lead-notify-config.tsx"),
    "utf8",
  );

  it("anuncia que está carregando", () => {
    // Os dois carregamentos eram `<p>` mudos, e os selects ficam `disabled`
    // enquanto eles rodam — ou seja, o campo some da ordem de tabulação sem
    // aviso e reaparece do nada. A Evolution cai de verdade, então esse estado
    // dura de verdade.
    expect(FONTE).toMatch(/aria-busy=/);
    expect(FONTE).toMatch(/StatusMessage tone="warning"/);
  });

  it("não decide o tom comparando texto traduzido", () => {
    // `tone={notice === t("saved") ? "success" : "error"}` funciona até alguém
    // editar o `pt.json` — aí um sucesso passa a ser anunciado como erro. O tom
    // é dado do estado, não do idioma.
    expect(FONTE).not.toMatch(/tone=\{notice === t\(/);
  });
});

describe("os estilos de campo do painel", () => {
  // `selectStyles` estava copiado em três arquivos com três valores diferentes,
  // e um deles ficou com a cor de borda reprovada por meio dia. A primitiva
  // `Select` existe para isso.
  const PASTA = join(process.cwd(), "src", "components", "admin");

  it("ninguém redeclara o estilo de seleção por conta própria", () => {
    const copias = readdirSync(PASTA)
      .filter((n) => n.endsWith(".tsx"))
      .filter((n) => /const selectStyles/.test(readFileSync(join(PASTA, n), "utf8")))
      .map((n) => relative(process.cwd(), join(PASTA, n)).split(sep).join("/"));

    expect(copias).toEqual([]);
  });
});
