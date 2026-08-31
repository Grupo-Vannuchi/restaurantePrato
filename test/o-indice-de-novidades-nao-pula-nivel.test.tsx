import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

import { InformationCard } from "@/components/information-card";
import { renderWithIntl, screen } from "./test-utils";

/**
 * O índice de novidades pulava de h1 para h3 assim que houvesse conteúdo.
 *
 * `/novidades` renderiza o `<h1>` da página e, logo abaixo, a grade de cards —
 * e o título de cada card é um `<h3>`. Sem nenhum `<h2>` no meio, o leitor de
 * tela anuncia um nível que não existe e quem navega por títulos perde a
 * estrutura.
 *
 * ⚠️ **Era invisível localmente porque o banco está vazio.** Sem artigo
 * cadastrado a grade não existe, e `e2e/a11y.spec.ts` passava verde nas duas
 * dimensões. O defeito apareceu no dia 31/08 quando inseri UM registro de teste
 * para conferir outra coisa — e apareceria, para valer, no dia em que o cliente
 * publicasse a primeira novidade.
 *
 * Na página do artigo os mesmos cards estão certos: ali eles ficam sob o `<h2>`
 * de "Páginas relacionadas". Ou seja, o nível não é propriedade do card, é
 * propriedade de onde ele foi colocado — e por isso vira parâmetro em vez de
 * ficar fixo em qualquer um dos dois valores.
 */
const CARD = {
  id: "1",
  slug: "buffet",
  icon: "Info",
  image: "",
  title: "Buffet novo",
  description: "Uma descrição qualquer.",
} as unknown as Parameters<typeof InformationCard>[0]["information"];

const INDICE = readFileSync(
  join(process.cwd(), "src/app/[locale]/(marketing)/novidades/page.tsx"),
  "utf8",
);
const ARTIGO = readFileSync(
  join(process.cwd(), "src/app/[locale]/(marketing)/novidades/[slug]/page.tsx"),
  "utf8",
);

const semComentarios = (texto: string) =>
  texto
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/.*$/gm, "");

describe("o nível do título do card de novidade", () => {
  it("é h3 por padrão, que é o certo debaixo de uma seção", () => {
    renderWithIntl(<InformationCard information={CARD} />);
    expect(screen.getByRole("heading", { name: "Buffet novo" }).tagName).toBe("H3");
  });

  it("aceita h2, para quando o card fica direto sob o título da página", () => {
    renderWithIntl(<InformationCard information={CARD} headingLevel={2} />);
    expect(screen.getByRole("heading", { name: "Buffet novo" }).tagName).toBe("H2");
  });

  it("o índice pede h2, porque acima dele só existe o h1 da página", () => {
    expect(semComentarios(INDICE)).toMatch(/headingLevel=\{2\}/);
  });

  it("a lista de relacionadas do artigo NÃO pede h2", () => {
    // Sentinela contra a correção exagerada: ali os cards ficam sob o `<h2>` de
    // "Páginas relacionadas", e promovê-los criaria dois h2 irmãos sem hierarquia.
    const relacionadas = semComentarios(ARTIGO).slice(
      semComentarios(ARTIGO).indexOf("relatedTitle"),
    );
    expect(relacionadas).not.toMatch(/headingLevel=\{2\}/);
  });
});
