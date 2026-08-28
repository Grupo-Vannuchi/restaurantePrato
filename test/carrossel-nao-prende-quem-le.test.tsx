import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}));

import { HeroCarousel } from "@/components/sections/hero-carousel";
import { act, renderWithIntl, screen } from "./test-utils";

/**
 * O carrossel do topo, com mais de um slide.
 *
 * ⚠️ Hoje a home tem UM slide de copy, então nada disto acontece: o autoplay
 * nem começa (`count <= 1`) e as setas não são renderizadas. São armadilhas
 * armadas, e disparam no minuto em que entrar o segundo slide — junto com as
 * fotos, quando ninguém vai estar olhando para acessibilidade. Por isso o teste
 * injeta dois slides em vez de esperar o conteúdo chegar.
 *
 * Três defeitos:
 *
 * 1. **Não havia como parar o giro.** Critério WCAG 2.2.2 (nível A): conteúdo
 *    em movimento que começa sozinho e dura mais de 5 segundos precisa de um
 *    mecanismo de pausar. A única pausa era `hover` e `focus` — e **toque não
 *    tem hover**: no celular o carrossel trocava debaixo do dedo de quem estava
 *    lendo, sem saída.
 * 2. **O `<h1>` da página sumia em 6 segundos.** Ele morava dentro do slide 0,
 *    e no primeiro tique do autoplay aquele slide recebia `aria-hidden`. A home
 *    ficava sem título nenhum para tecnologia assistiva.
 * 3. **A troca não era anunciada.** Quem apertava "Próximo slide" não ouvia
 *    nada: o conteúdo mudava e nenhuma região viva comunicava.
 */
const SLIDES = [
  { title: "A sua melhor pausa do dia", subtitle: "Buffet e churrasco na brasa." },
  { title: "Churrasco fatiado na hora", subtitle: "Picanha, maminha e linguiça." },
];

const ROTULOS = {
  carousel: "Destaques",
  prev: "Slide anterior",
  next: "Próximo slide",
  goTo: ["Ir para o slide 1", "Ir para o slide 2"],
  pause: "Pausar a troca automática de slides",
  play: "Retomar a troca automática de slides",
};

function montar() {
  return renderWithIntl(
    <HeroCarousel
      slides={SLIDES}
      eyebrow="Desde 1998"
      primaryCta="Ver o cardápio"
      secondaryCta="Falar com o restaurante"
      labels={ROTULOS}
    />,
  );
}

/** O título que a tecnologia assistiva de fato enxerga. */
function tituloVisivelParaLeitor(): HTMLElement | null {
  return screen
    .queryAllByRole("heading", { level: 1 })
    .find((h) => !h.closest("[aria-hidden='true']")) ?? null;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("o carrossel do topo com mais de um slide", () => {
  it("oferece um jeito de parar o giro", () => {
    // WCAG 2.2.2. `hover` não conta: toque não tem hover.
    montar();
    expect(
      screen.getByRole("button", { name: /pausar/i }),
      "não há controle de pausa no carrossel",
    ).toBeInTheDocument();
  });

  it("gira sozinho enquanto ninguém pede para parar", () => {
    // Sentinela: sem esta, o teste seguinte passaria verde num carrossel que
    // simplesmente não gira.
    montar();
    expect(tituloVisivelParaLeitor()).toHaveTextContent(SLIDES[0]!.title);
    act(() => void vi.advanceTimersByTime(6500));
    expect(tituloVisivelParaLeitor()).toHaveTextContent(SLIDES[1]!.title);
  });

  it("para de verdade quando a pessoa pausa", () => {
    montar();
    act(() => {
      screen.getByRole("button", { name: /pausar/i }).click();
    });
    act(() => void vi.advanceTimersByTime(20000));
    expect(tituloVisivelParaLeitor()).toHaveTextContent(SLIDES[0]!.title);
  });

  it("mantém um <h1> na árvore de acessibilidade a cada instante", () => {
    montar();
    expect(tituloVisivelParaLeitor()).not.toBeNull();
    act(() => void vi.advanceTimersByTime(6500));
    // Era aqui que a home ficava sem título nenhum.
    expect(
      tituloVisivelParaLeitor(),
      "a home ficou sem <h1> visível depois do primeiro tique",
    ).not.toBeNull();
    // E nunca mais de um: dois h1 anunciáveis é tão ruim quanto nenhum.
    const visiveis = screen
      .queryAllByRole("heading", { level: 1 })
      .filter((h) => !h.closest("[aria-hidden='true']"));
    expect(visiveis).toHaveLength(1);
  });

  it("anuncia a troca depois que a pessoa assume o controle", () => {
    const { container } = montar();
    const regiao = container.querySelector("[aria-live]");
    expect(regiao, "o carrossel não tem região viva").not.toBeNull();
    // Girando sozinho: `off`. Anunciar cada troca automática interromperia a
    // leitura da página a cada seis segundos.
    expect(regiao).toHaveAttribute("aria-live", "off");

    act(() => {
      screen.getByRole("button", { name: ROTULOS.next }).click();
    });
    // Sob controle da pessoa: `polite`. É o padrão APG.
    expect(regiao).toHaveAttribute("aria-live", "polite");
  });
});
