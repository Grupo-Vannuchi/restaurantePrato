import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { PageHeader } from "@/components/page-header";
import { renderWithIntl, screen } from "./test-utils";

/**
 * O título da página não pode esperar o JavaScript para existir.
 *
 * `Reveal` renderiza no servidor sempre com `data-visible="false"`, e o CSS
 * dá `opacity: 0` a tudo que tem `[data-reveal]`. O `PageHeader` envolvia o
 * `<h1>` e o subtítulo nisso — então, em oito das nove rotas, a faixa de topo
 * inteira só aparecia depois de: baixar ~204 KB de JavaScript, interpretar,
 * hidratar, o efeito rodar e o observador de interseção disparar.
 *
 * Medido no site publicado, em rede de celular médio em 4G com a CPU quatro
 * vezes mais lenta:
 *
 *   /              588 ms   (a home não usa Reveal no topo)
 *   /experiencia  2739 ms
 *   /gastronomia  2715 ms  (rota removida em 31/08)
 *   /galeria      2837 ms
 *   /reservas     2764 ms
 *   /contato      2877 ms
 *
 * Quase três segundos de tela sem título. E isso não aparecia na medição de
 * LCP — que ficou entre 228 e 1008 ms — porque LCP mede o maior elemento
 * PINTADO, e um título transparente não conta.
 *
 * A revelação ao rolar continua nas seções de baixo, onde ela é o que é: um
 * efeito para conteúdo que a pessoa ainda não alcançou. No topo ela custava
 * 2,2 segundos de conteúdo para uma animação que quase ninguém chega a ver.
 */
describe("o topo das páginas internas", () => {
  it("mostra o título sem depender de JavaScript", () => {
    renderWithIntl(<PageHeader title="Galeria" subtitle="Fotos da casa" />);

    const titulo = screen.getByRole("heading", { level: 1 });
    expect(titulo).not.toHaveAttribute("data-reveal");
    expect(titulo).not.toHaveAttribute("data-visible");
  });

  it("mostra o subtítulo junto, pelo mesmo motivo", () => {
    renderWithIntl(<PageHeader title="Galeria" subtitle="Fotos da casa" />);

    const sub = screen.getByText("Fotos da casa");
    expect(sub).not.toHaveAttribute("data-reveal");
  });

  it("continua sendo o cabeçalho — senão a guarda não guarda", () => {
    renderWithIntl(<PageHeader title="Galeria" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Galeria");
  });
});

describe("a revelação ao rolar", () => {
  // Ela continua existindo e valendo — o defeito não era o efeito, era usá-lo
  // em conteúdo que já está na tela quando a página abre.
  const RAIZ = join(process.cwd(), "src", "components");

  const arquivos = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const caminho = join(dir, e.name);
      if (e.isDirectory()) return arquivos(caminho);
      return e.name.endsWith(".tsx") ? [caminho] : [];
    });

  it("nunca envolve um h1", () => {
    const comH1 = arquivos(RAIZ)
      .filter((c) => /<Reveal[^>]*as="h1"/.test(readFileSync(c, "utf8")))
      .map((c) => relative(process.cwd(), c).split(sep).join("/"));

    expect(comH1).toEqual([]);
  });

  it("continua sendo usada em algum lugar", () => {
    const usam = arquivos(RAIZ).filter((c) =>
      /<Reveal/.test(readFileSync(c, "utf8")),
    );
    expect(usam.length).toBeGreaterThan(0);
  });
});
