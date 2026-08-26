import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// Mock completo: `importActual` puxaria a navegação do next-intl, que depende
// de `next/navigation` e não resolve fora do runtime do Next.
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/admin",
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { AdminNav } from "@/components/admin/admin-nav";
import { renderWithIntl, screen } from "./test-utils";

/**
 * Os marcos do painel diziam a coisa errada sobre o que cada parte é.
 *
 * A navegação PRIMÁRIA do painel morava dentro de um `<aside>`, que mapeia para
 * o marco `complementary`: o menu principal era anunciado como "conteúdo
 * complementar". E o mesmo bloco — logo, menu, sair — era `complementary` no
 * computador e `banner` no celular, porque as duas versões usam elementos
 * diferentes. Quem usa leitor de tela e navega por marcos encontrava coisas
 * distintas conforme o tamanho da janela.
 *
 * O `<nav>` também não tinha nome. Com um só visível por vez não é violação,
 * mas o nome é o que faz o leitor anunciar "navegação principal" no menu de
 * marcos, em vez de só "navegação".
 *
 * ⚠️ `AdminShell` é um componente de servidor `async` e não renderiza com a
 * biblioteca de testes. Por isso a parte dele é verificada na fonte — é uma
 * limitação real do arnês, não preguiça: uma verificação de comportamento
 * exigiria navegador, e os testes de navegador do painel seguem travados no
 * Docker.
 */
describe("a navegação do painel", () => {
  it("se apresenta como navegação, com nome", () => {
    renderWithIntl(<AdminNav />);

    expect(screen.getByRole("navigation")).toHaveAccessibleName();
  });
});

describe("a estrutura do painel", () => {
  // Sem comentários: o aviso que EXPLICA por que o `<aside>` saiu não é o
  // `<aside>`. Mesma armadilha da guarda de janelas modais.
  const FONTE = readFileSync(
    join(process.cwd(), "src", "components", "admin", "admin-shell.tsx"),
    "utf8",
  )
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  it("não põe a navegação primária num marco de conteúdo complementar", () => {
    expect(FONTE).not.toMatch(/<aside/);
  });

  it("mostra o nome da pessoa como texto, não como link", () => {
    // O logo já leva ao site público. O nome da pessoa ao lado levava ao MESMO
    // destino e se anunciava como "João Silva, link" — quem só ouve a lista de
    // links não tinha como saber para onde aquilo ia. Nome é identidade, não
    // destino: vira texto, e o link para o site ganha nome próprio.
    expect(FONTE).toMatch(/<(?:p|span)[^>]*>\s*\{user\.name\}/);
  });

  it("o ícone de link externo não promete o que o link não faz", () => {
    // `ExternalLink` é universalmente lido como "abre em nova aba". Ou o link
    // abre, ou o ícone sai. Aqui ele abre — é útil não perder a página do
    // painel — então a promessa passa a ser verdadeira, com `rel` de segurança.
    if (FONTE.includes("ExternalLink")) {
      expect(FONTE).toMatch(/target="_blank"/);
      expect(FONTE).toMatch(/rel="noreferrer"/);
      expect(FONTE).toMatch(/<ExternalLink[^>]*aria-hidden/);
    }
  });

  it("continua sendo o arquivo que monta o painel — senão a guarda não guarda", () => {
    expect(FONTE).toMatch(/AdminNav/);
    expect(FONTE).toMatch(/<main[^>]*id="conteudo"/);
  });
});
