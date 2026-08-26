import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { Input, Label, Textarea } from "@/components/ui/field";
import { renderWithIntl, screen } from "./test-utils";

/**
 * Mensagem de erro de campo tem que estar LIGADA ao campo, e ser anunciada.
 *
 * Os seis formulários do site renderizavam o erro como um parágrafo solto logo
 * abaixo do campo. `aria-describedby` não aparecia uma única vez em `src/` — o
 * parágrafo só existia para quem enxerga.
 *
 * Na prática: a pessoa envia com o slug vazio, o react-hook-form move o foco
 * para o campo, e o leitor de tela anuncia "Slug, edição, inválido" — e para aí.
 * O texto "Campo obrigatório", que está na tela, nunca é lido. A pessoa sabe que
 * errou e não sabe o quê. O mesmo vale para as 14 dicas de formato ("use
 * minúsculas e hífens"), que decidem se o envio funciona.
 *
 * ⚠️ Isto não é pego por axe: **não existe regra de axe** para "mensagem de erro
 * associada ao campo". O `contact-form.test.tsx` passa em axe desde sempre e
 * tinha o mesmo defeito nos seus três campos.
 *
 * O conserto não foi fiar `aria-describedby` à mão em 35 lugares — seria o mesmo
 * trabalho e voltaria a divergir no próximo campo criado. `Input` e `Textarea`
 * passam a receber `hint` e `error`, geram os ids e fazem a ligação sozinhos.
 */
describe("um campo com dica e erro", () => {
  it("aponta para os dois pelo aria-describedby", () => {
    renderWithIntl(
      <>
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" hint="Use minúsculas e hífens." error="Campo obrigatório." />
      </>,
    );

    const campo = screen.getByLabelText("Slug");
    const descrito = (campo.getAttribute("aria-describedby") ?? "").split(" ");

    expect(descrito).toHaveLength(2);
    for (const id of descrito) {
      expect(document.getElementById(id)).toBeTruthy();
    }
    const textos = descrito.map((id) => document.getElementById(id)!.textContent);
    expect(textos).toContain("Use minúsculas e hífens.");
    expect(textos).toContain("Campo obrigatório.");
  });

  it("marca o campo como inválido sozinho quando há erro", () => {
    renderWithIntl(<Input id="slug" aria-label="Slug" error="Campo obrigatório." />);

    expect(screen.getByLabelText("Slug")).toHaveAttribute("aria-invalid", "true");
  });

  it("anuncia o erro para quem não está olhando para o campo", () => {
    renderWithIntl(<Input id="slug" aria-label="Slug" error="Campo obrigatório." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Campo obrigatório.");
  });

  it("não inventa descrição quando não há dica nem erro", () => {
    renderWithIntl(<Input id="slug" aria-label="Slug" />);

    const campo = screen.getByLabelText("Slug");
    expect(campo).not.toHaveAttribute("aria-describedby");
    expect(campo).not.toHaveAttribute("aria-invalid");
  });

  it("soma a descrição que vem de fora, em vez de substituí-la", () => {
    // Há campo cuja dica precisa morar fora do componente por causa do layout —
    // o seletor de ícone fica num flex com a prévia. Se o `aria-describedby`
    // recebido substituísse o gerado, o erro sumiria da leitura justamente
    // nesses campos.
    renderWithIntl(
      <>
        <p id="dica-externa">Escolha um ícone da lista.</p>
        <Input
          id="icone"
          aria-label="Ícone"
          aria-describedby="dica-externa"
          error="Campo obrigatório."
        />
      </>,
    );

    const campo = screen.getByLabelText("Ícone");
    const ids = (campo.getAttribute("aria-describedby") ?? "").split(" ");

    expect(ids).toContain("dica-externa");
    const textos = ids.map((id) => document.getElementById(id)?.textContent);
    expect(textos).toContain("Escolha um ícone da lista.");
    expect(textos).toContain("Campo obrigatório.");
  });

  it("vale igual para área de texto", () => {
    renderWithIntl(
      <Textarea id="conteudo" aria-label="Conteúdo" error="Campo obrigatório." />,
    );

    const campo = screen.getByLabelText("Conteúdo");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    const id = campo.getAttribute("aria-describedby")!;
    expect(document.getElementById(id)).toHaveAttribute("role", "alert");
  });
});

describe("os formulários do site", () => {
  // A guarda: enquanto der para renderizar `<FieldError>` solto, o próximo campo
  // criado volta a ter erro desligado do campo. A ligação passa a ser a única
  // forma de mostrar erro de campo.
  const RAIZ = join(process.cwd(), "src", "components");

  const arquivos = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const caminho = join(dir, e.name);
      if (e.isDirectory()) return arquivos(caminho);
      return e.name.endsWith(".tsx") ? [caminho] : [];
    });

  it("nenhum usa FieldError solto — o erro vem pela prop do campo", () => {
    const soltos = arquivos(RAIZ)
      .filter((c) => !c.endsWith(join("ui", "field.tsx")))
      .filter((c) => /<FieldError/.test(readFileSync(c, "utf8")))
      .map((c) => relative(process.cwd(), c).split(sep).join("/"));

    expect(soltos).toEqual([]);
  });
});
