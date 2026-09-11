"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PastaPhoto = { image: string; alt: string };

/**
 * As fotos que abrem a ilha de massas.
 *
 * ── Por que rolagem, e não fade ───────────────────────────────────────────
 *
 * O topo da home usa um carrossel com autoplay e cross-fade, e o JavaScript que
 * isso custa se justifica lá: é a primeira coisa que a pessoa vê. Aqui não.
 * Quem chega nesta página quase sempre escaneou um código na mesa, num 4G ruim,
 * e quer ler o cardápio — então o deslize é `scroll-snap` nativo. O navegador
 * faz o trabalho, o dedo funciona **sem nenhum JavaScript**, e o script só
 * acrescenta setas e marcadores para quem usa mouse ou teclado.
 *
 * **Sem autoplay**, e não por economia: uma foto que troca sozinha atrapalha
 * quem está lendo a lista logo abaixo. Como não há movimento automático,
 * também não existe a exigência de pausa da WCAG 2.2.2 — que é a maquinaria
 * cujos defeitos latentes custaram uma manhã no carrossel da home.
 *
 * O índice sai do próprio `scrollLeft`, e não de um estado que manda na
 * rolagem. Assim os marcadores continuam certos quando a pessoa desliza com o
 * dedo, que é como a maioria vai usar isto.
 *
 * ⚠️ **Os marcadores têm 24 px de alvo, com 8 px de tinta.** No projeto irmão
 * eles são `size-2` — 8 px no total, um terço do mínimo que a WCAG 2.5.8 exige.
 * Num celular o dedo cobre uns 40 px, então errar o alvo vira regra. Aqui o
 * ponto visível continua com 8 px e quem cresce é o botão em volta: separar o
 * que se vê do que se toca é exatamente o remédio que a norma sugere, e não
 * muda nada no desenho.
 */
export function PastaCarousel({
  photos,
  labels,
}: {
  photos: PastaPhoto[];
  labels: { carousel: string; prev: string; next: string; goTo: string };
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
      className="relative"
      role="group"
      aria-roledescription="carousel"
      aria-label={labels.carousel}
    >
      <ul role="list"
        ref={trilhoRef}
        onScroll={aoRolar}
        /* `snap-x` mais `overflow-x-auto` fazem o deslize; `scrollbar-none` tira
           a barra, que num carrossel de fotos só suja a borda de baixo. */
        className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl"
      >
        {photos.map((foto, i) => (
          <li
            key={foto.image}
            className="w-full shrink-0 snap-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${photos.length}`}
          >
            <Image
              src={foto.image}
              alt={foto.alt}
              width={1100}
              height={619}
              /* Só a primeira disputa a banda inicial; as outras só aparecem
                 quando a pessoa deslizar. */
              priority={i === 0}
              loading={i === 0 ? undefined : "lazy"}
              quality={50}
              sizes="(min-width: 1280px) 768px, 100vw"
              className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
            />
          </li>
        ))}
      </ul>

      {/* Com uma foto só não há para onde navegar: seta que não leva a lugar
          nenhum e marcador solitário são interface prometendo o que não existe. */}
      {photos.length > 1 ? (
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
            onClick={() => irPara(Math.min(photos.length - 1, atual + 1))}
            disabled={atual === photos.length - 1}
            aria-label={labels.next}
            className={`${seta} right-3 disabled:pointer-events-none disabled:opacity-0`}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>

          <div className="mt-4 flex justify-center gap-1">
            {photos.map((foto, i) => (
              <button
                key={foto.image}
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
