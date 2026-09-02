import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const caminhoAtual = vi.fn(() => "/");
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => caminhoAtual(),
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

import { FooterMap } from "@/components/layout/footer-map";
import { renderWithIntl } from "./test-utils";

/**
 * O mapa aparece uma vez por página, e na página de contato ele aparece em cima.
 *
 * Quem abre `/contato` quer saber onde fica antes de escrever. O mapa vivia só
 * no rodapé, no fim de tudo — a informação mais procurada daquela página
 * chegando por último.
 *
 * Subi-lo cria o problema oposto: dois mapas na mesma página, a algumas
 * centenas de pixels um do outro. Isso não informa duas vezes; informa uma vez
 * e ocupa o dobro do espaço — e paga duas vezes o custo, porque cada embutido é
 * um quadro do Google com JavaScript próprio.
 *
 * Por isso o rodapé passa a decidir pela rota, e essa decisão mora num
 * componente próprio: o rodapé é montado no layout, que não sabe qual página
 * está renderizando.
 */
const RAIZ = process.cwd();
const ler = (relativo: string) => readFileSync(join(RAIZ, relativo), "utf8");

const semComentarios = (texto: string) =>
  texto
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/.*$/gm, "");

const MAPA = { src: "https://exemplo/mapa", title: "Nossa localização no mapa" };

/**
 * O jsdom não implementa `IntersectionObserver`, e o embutido do mapa monta um
 * no efeito para só buscar o quadro do Google quando ele chega perto da tela.
 * Sem este substituto o componente lança na montagem, e o teste falharia por
 * ausência da API, não pelo comportamento que ele existe para cobrar.
 */
class ObservadorDeInterseccao {
  observe() {}
  disconnect() {}
  unobserve() {}
}
vi.stubGlobal("IntersectionObserver", ObservadorDeInterseccao);

beforeEach(() => {
  caminhoAtual.mockReturnValue("/");
});

describe("o mapa do rodapé", () => {
  it("aparece nas páginas em geral", () => {
    const { container } = renderWithIntl(<FooterMap {...MAPA} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("some na página de contato, onde ele já está em cima", () => {
    caminhoAtual.mockReturnValue("/contato");
    const { container } = renderWithIntl(<FooterMap {...MAPA} />);
    expect(container.firstChild).toBeNull();
  });

  it("decide pelo caminho SEM o prefixo de idioma", () => {
    // `usePathname` do next-intl já devolve sem o prefixo. Se algum dia passar a
    // devolver `/pt/contato`, a comparação exata falharia calada e a página de
    // contato voltaria a ter dois mapas.
    caminhoAtual.mockReturnValue("/pt/contato");
    const { container } = renderWithIntl(<FooterMap {...MAPA} />);
    expect(
      container.firstChild,
      "o caminho veio com prefixo de idioma — a comparação precisa acompanhar",
    ).toBeNull();
  });
});

describe("quem monta o mapa em cada lugar", () => {
  it("o rodapé delega ao FooterMap, e não embute direto", () => {
    // Embutir direto ali burlaria a regra da rota sem nada acusar.
    const rodape = semComentarios(ler("src/components/layout/footer.tsx"));
    expect(rodape).toMatch(/<FooterMap/);
    expect(rodape).not.toMatch(/<MapEmbed/);
  });

  it("a página de contato mostra o mapa ANTES do formulário", () => {
    const pagina = semComentarios(
      ler("src/app/[locale]/(marketing)/contato/page.tsx"),
    );
    const mapa = pagina.indexOf("<MapEmbed");
    const formulario = pagina.indexOf("<ContactForm");
    expect(mapa, "a página de contato não mostra o mapa").toBeGreaterThan(-1);
    expect(formulario, "a página de contato não tem formulário").toBeGreaterThan(-1);
    expect(
      mapa,
      "o mapa precisa vir antes: quem abre esta página quer saber onde fica antes de escrever",
    ).toBeLessThan(formulario);
  });

  it("o embutido continua carregando só quando chega perto", () => {
    // Sentinela: a mudança de lugar não pode custar o adiamento. Na página de
    // contato o mapa passou a ficar perto do topo, então ele agora carrega cedo
    // ALI — mas em toda outra página continua esperando o rodapé aparecer.
    const embutido = semComentarios(ler("src/components/layout/map-embed.tsx"));
    expect(embutido).toMatch(/IntersectionObserver/);
  });
});
