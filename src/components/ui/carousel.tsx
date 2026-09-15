"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CarouselLabels = {
  carousel: string;
  prev: string;
  next: string;
  /** Com `{n}` no lugar do número do slide. */
  goTo: string;
};

/**
 * A mecânica de deslize, sem opinião sobre o que vai dentro de cada slide.
 *
 * Nasceu como o carrossel de fotos da ilha de massas e virou componente próprio
 * em 15/09, acompanhando o projeto irmão. Duas cópias da mesma lógica de
 * rolagem envelhecem torto: uma ganha correção, a outra não.
 *
 * ⚠️ **A extração tem UM consumidor hoje, e isso foi dito antes de fazer.** No
 * projeto irmão também tem um só — o `wine-photos.tsx` que justificou a
 * extração lá foi criado em 11/09 e já não existe. Foi feita a pedido do dono
 * do projeto, com o cardápio voltando para revisão em seguida: se aparecer um
 * segundo carrossel lá, ele encontra a mecânica pronta. Registrado para quem
 * abrir isto e se perguntar por que um componente compartilhado serve a um
 * chamador.
 *
 * ── Por que rolagem, e não fade ───────────────────────────────────────────
 *
 * O topo da home usa autoplay com cross-fade, e o JavaScript que isso custa se
 * justifica lá: é a primeira coisa que a pessoa vê. Aqui não. Quem chega no
 * cardápio quase sempre escaneou um código na mesa, num 4G ruim, e quer ler —
 * então o deslize é `scroll-snap` nativo. O navegador faz o trabalho, o dedo
 * funciona **sem nenhum JavaScript**, e o script só acrescenta setas e
 * marcadores para quem usa mouse ou teclado.
 *
 * **Sem autoplay**, e não por economia: conteúdo que troca sozinho atrapalha
 * quem está lendo a lista logo abaixo. Como não há movimento automático, também
 * não existe a exigência de pausa da WCAG 2.2.2 — a maquinaria cujos defeitos
 * latentes custaram uma manhã no carrossel da home.
 *
 * O índice sai do próprio `scrollLeft`, e não de um estado que manda na
 * rolagem. Assim os marcadores continuam certos quando a pessoa desliza com o
 * dedo, que é como a maioria vai usar isto.
 *
 * ⚠️ **Os marcadores têm 24 px de alvo com 8 px de tinta, e isso é divergência
 * deliberada do projeto irmão.** Lá eles são `size-2` — 8 px no total, um terço
 * do mínimo da WCAG 2.5.8. Num celular o dedo cobre uns 40 px, então errar o
 * alvo vira regra. Aqui o ponto visível continua com 8 px e quem cresce é o
 * botão em volta: separar o que se vê do que se toca é o remédio que a própria
 * norma sugere, e não muda nada no desenho.
 */
export function Carousel({
  labels,
  count,
  className,
  trackClassName,
  children,
}: {
  labels: CarouselLabels;
  /** Quantos slides `children` produz. Abaixo de 2 os controles somem. */
  count: number;
  className?: string;
  /** Classe do trilho — o carrossel de fotos arredonda, um de cards não. */
  trackClassName?: string;
  children: React.ReactNode;
}) {
  const trilhoRef = useRef<HTMLUListElement>(null);
  const [atual, setAtual] = useState(0);

  /**
   * Começa `false` para servidor e cliente pintarem igual — um valor lido do
   * sistema no primeiro render daria HTML diferente do da hidratação. O efeito
   * liga assim que dá para perguntar.
   */
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ler = () => setAnimar(!mq.matches);
    ler();
    mq.addEventListener("change", ler);
    return () => mq.removeEventListener("change", ler);
  }, []);

  const aoRolar = useCallback(() => {
    const el = trilhoRef.current;
    if (!el) return;
    setAtual(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const irPara = useCallback(
    (i: number) => {
      const el = trilhoRef.current;
      if (!el) return;
      el.scrollTo({
        left: i * el.clientWidth,
        // Quem pediu menos movimento salta em vez de deslizar.
        behavior: animar ? "smooth" : "auto",
      });
    },
    [animar],
  );

  const seta =
    "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background focus-visible:bg-background sm:inline-flex";

  return (
    <div
      className={className ?? "relative"}
      role="group"
      aria-roledescription="carousel"
      aria-label={labels.carousel}
    >
      <ul
        /*
         * ⚠️ `role="list"` explícito, e é outra divergência deliberada do
         * projeto irmão. O reset do Tailwind remove o marcador de toda lista, e
         * o Safari então retira a SEMÂNTICA de lista junto — quem usa leitor de
         * tela deixa de ouvir "lista, N itens", que é o que permite decidir
         * pular a seção. Foi corrigido em 32 listas do site em 12/09.
         */
        role="list"
        ref={trilhoRef}
        onScroll={aoRolar}
        /* `snap-x` mais `overflow-x-auto` fazem o deslize; `scrollbar-none` tira
           a barra, que num carrossel só suja a borda de baixo. */
        className={`scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain ${
          trackClassName ?? "rounded-2xl"
        }`}
      >
        {children}
      </ul>

      {/* Com um slide só não há para onde navegar: seta que não leva a lugar
          nenhum e marcador solitário são interface prometendo o que não existe. */}
      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => irPara(Math.max(0, atual - 1))}
            disabled={atual === 0}
            aria-label={labels.prev}
            className={`${seta} left-3 disabled:pointer-events-none disabled:opacity-0`}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => irPara(Math.min(count - 1, atual + 1))}
            disabled={atual === count - 1}
            aria-label={labels.next}
            className={`${seta} right-3 disabled:pointer-events-none disabled:opacity-0`}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>

          <div className="mt-4 flex justify-center gap-1">
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => irPara(i)}
                aria-label={labels.goTo.replace("{n}", String(i + 1))}
                aria-current={i === atual}
                // 24 px de alvo (`size-6`) com 8 px de tinta dentro — ver a nota
                // sobre a WCAG 2.5.8 no topo do arquivo.
                className="flex size-6 items-center justify-center rounded-full"
              >
                <span
                  aria-hidden
                  className={`block size-2 rounded-full transition-colors ${
                    i === atual ? "bg-brand" : "bg-border"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * Um slide do carrossel.
 *
 * Existe como componente, e não como `<li>` escrito por cada chamador, para a
 * semântica de slide morar num lugar só. Este repositório já teve um
 * `role="tablist"` declarado e não cumprido — apontando `aria-controls` para
 * painéis inexistentes —, e a lição foi que contrato de acessibilidade espalhado
 * por chamadores é contrato que um deles vai esquecer.
 */
export function CarouselSlide({
  index,
  total,
  className,
  children,
}: {
  index: number;
  total: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li
      className={className ?? "w-full shrink-0 snap-center"}
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} / ${total}`}
    >
      {children}
    </li>
  );
}
