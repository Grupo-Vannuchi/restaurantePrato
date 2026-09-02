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
      <div
        aria-live={pausadoPelaPessoa ? "polite" : "off"}
        className="relative h-[34rem] sm:h-[42rem]"
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
                "absolute inset-0 transition-opacity duration-700 ease-out",
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
                    className="object-cover"
                  />
                )
              ) : (
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[radial-gradient(120%_100%_at_80%_20%,var(--color-accent)_0%,transparent_55%),radial-gradient(90%_90%_at_20%_90%,var(--color-brand)_0%,transparent_60%)] opacity-30"
                />
              )}
              {/* Readability overlay — strong on the left where the text sits. */}
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />

              <Container className="relative flex h-full max-w-none flex-col items-start justify-center gap-6 text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur">
                  <span className="size-2 animate-pulse rounded-full bg-brand" aria-hidden />
                  {eyebrow}
                </span>
                <Heading className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
                  {slide.title}
                </Heading>
                <p className="max-w-xl text-pretty text-lg text-muted-foreground">
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
                    className={buttonVariants({ variant: "outline", size: "lg" })}
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
