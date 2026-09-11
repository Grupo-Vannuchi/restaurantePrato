"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  /**
   * Background photo. Optional: while the client's authorial photography is
   * pending, slides render a brand-coloured gradient instead of a stand-in
   * photo — a generic stock image would misrepresent the restaurant.
   */
  image?: string;
  title: string;
  subtitle: string;
};

export type HeroCarouselLabels = {
  carousel: string;
  prev: string;
  next: string;
  /** One "Go to slide N" label per slide. */
  goTo: string[];
  pause: string;
  play: string;
};

/**
 * Full-width hero image carousel — mirrors the reference site's hero: a
 * background image per slide with overlaid heading/subtitle + CTAs, autoplay,
 * prev/next arrows and dot indicators. Slides cross-fade; autoplay pauses on
 * hover/focus and is disabled under `prefers-reduced-motion`.
 */
export function HeroCarousel({
  slides,
  eyebrow,
  primaryCta,
  secondaryCta,
  labels,
}: {
  slides: HeroSlide[];
  eyebrow: string;
  primaryCta: string;
  secondaryCta: string;
  labels: HeroCarouselLabels;
}) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  /*
   * Pausa PEDIDA pela pessoa, separada da pausa por `hover`/`focus`.
   *
   * A pausa antiga era só `onMouseEnter`/`onFocusCapture`, e isso não é o
   * "mecanismo de pausar" que a WCAG 2.2.2 (nível A) exige: **toque não tem
   * hover**. No celular o carrossel trocava debaixo do dedo de quem estava
   * lendo, sem saída nenhuma. Quem usa leitor de tela sem foco dentro da região
   * também não pausava.
   *
   * Qualquer interação com as setas ou os indicadores também para o giro: é a
   * recomendação do padrão APG, e é o que faz a troca poder ser anunciada sem
   * interromper a leitura a cada seis segundos.
   */
  const [pausadoPelaPessoa, setPausadoPelaPessoa] = useState(false);
  // Only the first slide's image (the LCP element) is rendered server-side; the
  // rest mount after first paint so they don't compete for bandwidth with the
  // LCP image during the critical initial load. Flipped on right after mount —
  // long before autoplay (6s) or any user interaction needs them.
  const [deferredReady, setDeferredReady] = useState(false);

  const go = useCallback(
    (n: number) => {
      setPausadoPelaPessoa(true);
      setIndex((n + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setDeferredReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  // Autoplay (skipped when paused, single-slide, or reduced-motion is on).
  useEffect(() => {
    if (paused || pausadoPelaPessoa || count <= 1) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => window.clearInterval(id);
  }, [paused, pausadoPelaPessoa, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={labels.carousel}
      className="relative isolate overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/*
        * `off` enquanto gira sozinho, `polite` quando a pessoa assume o
        * controle. Anunciar cada troca automática interromperia a leitura da
        * página a cada seis segundos; não anunciar a troca que a pessoa pediu
        * deixa quem apertou "Próximo slide" sem resposta nenhuma. É o padrão
        * APG para carrossel.
        */}
      {/*
        * ⚠️ **Altura MÍNIMA em grade, e não altura fixa — corrigido em 11/09.**
        *
        * Era `h-[34rem] sm:h-[42rem]` com os slides em `absolute inset-0`, que
        * não empurram caixa nenhuma. Quem aumenta o corpo do texto no navegador
        * via o bloco descer dentro de uma moldura que não acompanha, encontrar a
        * faixa de controles — que é `z-10` e fica por cima — e, mais adiante,
        * sair inteiro da caixa e parar sobre a seção de baixo.
        *
        * Medido no celular, botão "reservar" contra os marcadores: em 100% havia
        * 29 px de folga; em **125%** os marcadores já entravam 24 px dentro do
        * botão; em **150%** cobriam o centro dele, e o toque parava num marcador
        * de 10 px; em **175%** o coberto passava a ser o PRIMEIRO botão; em
        * **200%** os dois saíam da caixa, que acabava 245 px acima deles.
        *
        * Não é um layout em `rem` que devia se salvar sozinho: a altura em `rem`
        * cresce com a fonte, mas a LARGURA DA TELA não. Com o corpo no dobro, o
        * título quebra em mais que o dobro de linhas nos mesmos 412 px, e o
        * texto cresce mais rápido que a moldura.
        *
        * Os três slides ocupam a MESMA célula (`col-start-1 row-start-1`), então
        * a caixa fica com a altura do mais alto e não pula na troca — o que a
        * sobreposição em `absolute` também dava, e que é a razão de a grade
        * substituí-la em vez de simplesmente virar `min-h` com `absolute`.
        *
        * ⚠️ **`grid-cols-1` não é redundante com uma célula só.** Sem ele a
        * coluna é implícita e portanto `auto`, que se dimensiona pelo conteúdo:
        * medido a 320 px de largura com o texto em 200%, o slide saía com 416 px
        * — a foto e o véu junto com ele. `grid-cols-1` é
        * `minmax(0, 1fr)` no Tailwind, e o `0` é a parte que importa: ele
        * autoriza a coluna a encolher abaixo do conteúdo em vez de empurrar a
        * caixa. O `overflow-hidden` da seção escondia o efeito, então isto não
        * aparecia como transbordo de página — aparecia como imagem renderizada
        * mais larga do que a tela, de graça.
        *
        * `e2e/os-botoes-do-topo-continuam-clicaveis.spec.ts` mede as três
        * invariantes em cinco escalas de fonte.
        */}
      <div
        aria-live={pausadoPelaPessoa ? "polite" : "off"}
        className="relative grid grid-cols-1 min-h-[34rem] sm:min-h-[42rem]"
      >
        {slides.map((slide, i) => {
          const active = i === index;
          /*
           * O `<h1>` acompanha o slide ATIVO, e não o primeiro.
           *
           * Ele morava dentro do slide 0 (`i === 0 ? "h1" : "h2"`), e no
           * primeiro tique do autoplay aquele slide recebia `aria-hidden` — a
           * home ficava, aos seis segundos, sem título nenhum para tecnologia
           * assistiva, com o topo da lista de cabeçalhos virando um `h2` de
           * seção. Como os slides inativos saem da árvore de acessibilidade,
           * existe sempre exatamente um `h1` anunciável.
           *
           * No servidor o índice é 0, então o HTML entregue já traz o `h1` —
           * é o que `test/topo-visivel-sem-javascript.test.tsx` cobra.
           */
          const Heading = active ? "h1" : "h2";
          return (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
              aria-hidden={!active}
              className={cn(
                // `relative` na mesma célula da grade: o slide entra no cálculo
                // da altura em vez de flutuar sobre uma moldura fixa. Continua
                // sendo o ancestral posicionado de que a foto `fill` e o véu
                // precisam.
                "relative col-start-1 row-start-1 flex flex-col justify-center transition-opacity duration-700 ease-out",
                active ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              {slide.image ? (
                (i === 0 || deferredReady) && (
                  <Image
                    src={slide.image}
                    alt=""
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    quality={50}
                    className="object-cover"
                  />
                )
              ) : (
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[radial-gradient(120%_100%_at_80%_20%,var(--color-accent)_0%,transparent_55%),radial-gradient(90%_90%_at_20%_90%,var(--color-brand)_0%,transparent_60%)] opacity-30"
                />
              )}
              {/* Véu de leitura, ESCURO desde 09/09/2026.
                  Ele era claro, com texto escuro por cima, e o cliente pediu a
                  troca. Não é uma mudança só: inverter o véu obriga a inverter
                  título, subtítulo, etiqueta e o botão vazado — que eram
                  escuros e sumiriam. E invalida as medições de contraste
                  anteriores, refeitas depois da troca.

                  ⚠️ **Ele precisa de dois desenhos, e o motivo é geométrico.**
                  No desktop o texto ocupa a metade esquerda, então um degradê
                  HORIZONTAL cobre onde ele está e deixa a foto aparecer à
                  direita. No celular o mesmo bloco atravessa a largura toda e
                  entra na ponta translúcida: com a foto que chegou em 03/09, o
                  subtítulo caiu para 1,20:1, contra o mínimo de 4,5:1.

                  Nada acusava. A página desenhava, o teste de paleta seguia
                  verde porque mede tokens e não pixels, e a versão de desktop
                  media 4,68:1 — o defeito existia só na largura em que ninguém
                  estava olhando. `e2e/o-texto-sobre-a-foto-continua-legivel.spec.ts`
                  roda nos dois tamanhos por isso.

                  Abaixo de `sm`, então, véu chapado e forte; de `sm` para cima,
                  o degradê que preserva a foto. */}
              <div className="absolute inset-0 bg-foreground/75 sm:bg-transparent sm:bg-gradient-to-r sm:from-foreground/90 sm:via-foreground/78 sm:to-foreground/35" />

              {/* O recuo vertical não é respiro: ele RESERVA a faixa onde
                  moram os controles. A mais alta delas são as setas — `bottom-2.5`
                  mais `size-11`, ou 3,375rem contados da borda de baixo —, e
                  4rem deixa 10 px de folga. Simétrico de propósito: com
                  `justify-center`, recuo igual em cima e embaixo deixa o
                  conteúdo exatamente onde ele estava antes desta correção, então
                  a tela em 100% não mudou de desenho. Só cresce a caixa quando o
                  texto realmente precisa. */}
              <Container className="relative flex max-w-none flex-col items-start gap-6 py-16 text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-background/30 bg-background/10 px-4 py-1.5 text-sm font-medium text-background backdrop-blur">
                  <span className="size-2 animate-pulse rounded-full bg-brand" aria-hidden />
                  {eyebrow}
                </span>
                <Heading className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-background sm:text-6xl">
                  {slide.title}
                </Heading>
                <p className="max-w-xl text-pretty text-lg text-background">
                  {slide.subtitle}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/cardapio"
                    tabIndex={active ? undefined : -1}
                    className={buttonVariants({ size: "lg", className: "group" })}
                  >
                    {primaryCta}
                    <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/contato"
                    tabIndex={active ? undefined : -1}
                    className={buttonVariants({
                      variant: "outline",
                      size: "lg",
                      // Sobre o véu escuro, a borda e o texto do vazado padrão
                      // — que são escuros — sumiriam. Aqui ele inverte.
                      className: "border-background/60 text-background hover:bg-background/15",
                    })}
                  >
                    {secondaryCta}
                  </Link>
                </div>
              </Container>
            </div>
          );
        })}

        {count > 1 ? (
          <>
            {/* Bottom-right, not vertically centred: the copy is left-aligned and
                full-height arrows sat on top of the subtitle at desktop widths. */}
            <div className="absolute bottom-2.5 right-3 z-10 flex gap-2 sm:right-5">
              <button
                type="button"
                onClick={() => setPausadoPelaPessoa((v) => !v)}
                aria-label={pausadoPelaPessoa ? labels.play : labels.pause}
                className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-background/70 text-foreground backdrop-blur transition-colors hover:bg-background"
              >
                {pausadoPelaPessoa ? (
                  <Play className="size-5" />
                ) : (
                  <Pause className="size-5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label={labels.prev}
                className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-background/70 text-foreground backdrop-blur transition-colors hover:bg-background"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label={labels.next}
                className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-background/70 text-foreground backdrop-blur transition-colors hover:bg-background"
              >
                <ChevronRight className="size-6" />
              </button>
            </div>

            <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1">
              {slides.map((_, i) => (
                // 24px-tall flex wrapper keeps the tap target accessible
                // (WCAG 2.5.8 / Lighthouse `target-size`) while the inner bar
                // stays visually small.
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={labels.goTo[i]}
                  aria-current={i === index}
                  className="group flex h-6 min-w-6 items-center justify-center px-2"
                >
                  <span
                    className={cn(
                      "h-2.5 rounded-full transition-all",
                      i === index
                        ? "w-8 bg-brand"
                        : "w-2.5 bg-foreground/50 group-hover:bg-foreground/70",
                    )}
                  />
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
