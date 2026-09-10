import { describe, expect, it } from "vitest";

import { PastaCarousel } from "@/components/cardapio/pasta-carousel";
import { renderWithIntl, screen, within } from "./test-utils";

/**
 * O carrossel que abre a ilha de massas.
 *
 * ⚠️ **A seção começou como grade, e a troca foi decisão do cliente.** Eu havia
 * argumentado contra o carrossel: ele mostra uma massa e esconde duas, e a
 * maquinaria de autoplay com pausa (WCAG 2.2.2), setas, marcadores e foco foi a
 * mesma cujos defeitos latentes custaram uma manhã no carrossel da home.
 *
 * Metade do argumento estava errada, e vale registrar: **este carrossel não tem
 * autoplay.** O deslize é `scroll-snap` nativo, o dedo funciona sem JavaScript
 * nenhum, e o script só acrescenta setas e marcadores para quem usa mouse ou
 * teclado. Sem movimento automático, não existe exigência de pausa — eu tinha
 * assumido autoplay por analogia com o da home, sem olhar.
 *
 * ⚠️ **Uma correção em relação ao original do projeto irmão: o alvo de toque.**
 * Lá os marcadores são botões de 8×8 px. A WCAG 2.5.8 exige 24×24 no mínimo, e
 * num celular um alvo de 8 px erra mais do que acerta. Aqui o ponto continua com
 * 8 px de tinta, mas o botão que o contém tem 24 — a área clicável cresce sem
 * mudar o desenho. É o mesmo remédio que a norma sugere: separar o que se vê do
 * que se toca.
 */
const FOTOS = [
  { image: "/massas/fettuccine-ao-pesto.webp", alt: "Foto de Fettuccine ao pesto" },
  { image: "/massas/nhoque-ao-sugo.webp", alt: "Foto de Nhoque ao sugo" },
  { image: "/massas/tres-massas.webp", alt: "Foto de Massas da ilha" },
];

const ROTULOS = {
  carousel: "Fotos das massas",
  prev: "Foto anterior",
  next: "Próxima foto",
  goTo: "Ir para a foto {n}",
};

describe("o carrossel das massas", () => {
  it("mostra uma foto por slide, cada uma com texto alternativo próprio", () => {
    renderWithIntl(<PastaCarousel photos={FOTOS} labels={ROTULOS} />);

    const imagens = screen.getAllByRole("img");
    expect(imagens).toHaveLength(3);
    const alts = imagens.map((i) => i.getAttribute("alt"));
    // Três massas lidas como "foto do prato" três vezes descreveriam uma massa
    // repetida — que é o oposto do que a faixa existe para dizer.
    expect(new Set(alts).size).toBe(3);
  });

  it("dá um marcador por foto, e marca em qual se está", () => {
    renderWithIntl(<PastaCarousel photos={FOTOS} labels={ROTULOS} />);

    const marcadores = FOTOS.map((_, i) =>
      screen.getByRole("button", { name: `Ir para a foto ${i + 1}` }),
    );
    expect(marcadores).toHaveLength(3);
    // Sem `aria-current`, quem usa leitor de tela ouve três botões idênticos e
    // não sabe onde está.
    expect(marcadores[0]).toHaveAttribute("aria-current", "true");
    expect(marcadores[1]).not.toHaveAttribute("aria-current", "true");
  });

  it("cada marcador tem alvo de toque de ao menos 24 px", () => {
    /*
     * WCAG 2.5.8 (Tamanho do Alvo, Mínimo — AA na 2.2). O original do projeto
     * irmão usa `size-2`, que são 8 px: um terço do mínimo. Num celular o dedo
     * cobre uns 40 px, então errar o alvo é a regra e não a exceção.
     *
     * A verificação é pela CLASSE e não pela geometria porque o jsdom não faz
     * layout — não há como medir pixel aqui. `size-6` são 24 px em Tailwind, e
     * é o menor tamanho que a norma aceita.
     */
    renderWithIntl(<PastaCarousel photos={FOTOS} labels={ROTULOS} />);

    const marcador = screen.getByRole("button", { name: "Ir para a foto 1" });
    expect(marcador.className).toMatch(/\bsize-6\b/);
  });

  it("com uma foto só, não desenha setas nem marcadores", () => {
    /*
     * Seta que não leva a lugar nenhum e um marcador solitário são interface
     * prometendo navegação onde não há nada para navegar. É também o estado
     * para onde a seção volta se alguém apagar duas das três fotos.
     */
    const { container } = renderWithIntl(
      <PastaCarousel photos={[FOTOS[0]!]} labels={ROTULOS} />,
    );

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("anuncia a si mesmo como carrossel, e cada slide com a posição", () => {
    // Sem isso o leitor de tela lê três imagens soltas e não avisa que há mais
    // adiante — a pessoa não sabe que existe algo para deslizar.
    const { container } = renderWithIntl(
      <PastaCarousel photos={FOTOS} labels={ROTULOS} />,
    );

    const raiz = container.querySelector('[aria-roledescription="carousel"]');
    expect(raiz).not.toBeNull();
    expect(raiz).toHaveAttribute("aria-label", "Fotos das massas");

    const slides = container.querySelectorAll('[aria-roledescription="slide"]');
    expect(slides).toHaveLength(3);
    expect(within(slides[1] as HTMLElement).getByRole("img")).toBeInTheDocument();
    expect(slides[1]).toHaveAttribute("aria-label", "2 / 3");
  });
});
