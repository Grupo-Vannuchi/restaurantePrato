"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { InformationView } from "@/lib/queries";

/**
 * Shared lightbox carousel for the information cover images. A single modal lives
 * at the provider; any card's image button opens it at that card's image, and the
 * user pages through every information's image with the arrows or ←/→ keys.
 */
type GalleryContextValue = { openAt: (slug: string) => void };

const GalleryContext = createContext<GalleryContextValue | null>(null);

/** Image buttons call this to open the shared carousel. Null if no provider. */
export function useInformationGallery(): GalleryContextValue | null {
  return useContext(GalleryContext);
}

export function InformationGallery({
  items,
  children,
}: {
  items: InformationView[];
  children: React.ReactNode;
}) {
  const t = useTranslations("novidades");
  const [index, setIndex] = useState<number | null>(null);
  const isOpen = index !== null;

  const dialogRef = useRef<HTMLDivElement | null>(null);
  /** Quem abriu o modal — para o foco ter para onde voltar quando ele fechar. */
  const gatilhoRef = useRef<HTMLElement | null>(null);

  const openAt = useCallback(
    (slug: string) => {
      const i = items.findIndex((it) => it.slug === slug);
      if (i < 0) return;
      // Guardado ANTES de abrir: depois da troca de estado o elemento ativo já
      // pode ter mudado, e é este que a pessoa espera reencontrar ao fechar.
      gatilhoRef.current = document.activeElement as HTMLElement | null;
      setIndex(i);
    },
    [items],
  );

  const close = useCallback(() => setIndex(null), []);

  const move = useCallback(
    (dir: number) =>
      setIndex((cur) =>
        cur === null ? cur : (cur + dir + items.length) % items.length,
      ),
    [items.length],
  );

  /**
   * Gestão de foco do modal.
   *
   * `aria-modal="true"` promete à tecnologia assistiva que o resto da página
   * está inerte. Sem mover o foco para dentro, a promessa é falsa: o foco fica
   * no gatilho, ATRÁS do overlay, e a tabulação segue passeando pela página
   * escondida — sem alcançar o fechar nem as setas, que existem e têm rótulo.
   * Ao fechar, o foco tem que voltar de onde saiu; cair no `<body>` devolve a
   * pessoa ao topo do documento e faz perder o lugar na lista.
   */
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focaveis = (): HTMLElement[] =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => !el.hasAttribute("disabled"));

    // O primeiro focável é o botão de fechar — a saída, que é o que a pessoa
    // mais precisa ter à mão ao entrar.
    focaveis()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key === "ArrowLeft") return move(-1);
      if (e.key === "ArrowRight") return move(1);
      if (e.key !== "Tab") return;

      const alvos = focaveis();
      if (alvos.length === 0) return;
      const primeiro = alvos[0]!;
      const ultimo = alvos[alvos.length - 1]!;
      const ativo = document.activeElement;
      const dentro = ativo instanceof Node && dialog.contains(ativo);

      // A volta é circular: chegando à ponta, o Tab retorna à outra ponta em
      // vez de sair. Se o foco estiver fora (nunca deveria), traz de volta.
      if (e.shiftKey && (!dentro || ativo === primeiro)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (!dentro || ativo === ultimo)) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      gatilhoRef.current?.focus();
      gatilhoRef.current = null;
    };
  }, [isOpen, close, move]);

  const current = index !== null ? items[index] : null;

  const arrowClass =
    "absolute top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus-visible:bg-white/25";

  return (
    <GalleryContext.Provider value={{ openAt }}>
      {children}

      {current ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
          onClick={close}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/85 p-4 backdrop-blur-sm"
        >
          <span className="absolute left-4 top-4 text-sm font-medium text-white/90">
            {index! + 1} / {items.length}
          </span>

          <button
            type="button"
            onClick={close}
            aria-label={t("menuClose")}
            className="absolute right-3 top-3 z-10 inline-flex size-10 items-center justify-center rounded-md text-white/90 transition-colors hover:bg-white/10 focus-visible:bg-white/10"
          >
            <X className="size-6" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              move(-1);
            }}
            aria-label={t("prevImage")}
            className={`${arrowClass} left-2 sm:left-4`}
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              move(1);
            }}
            aria-label={t("nextImage")}
            className={`${arrowClass} right-2 sm:right-4`}
          >
            <ChevronRight className="size-6" />
          </button>

          <figure
            className="flex w-full max-w-4xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[3/2] max-h-[80vh] w-full overflow-hidden rounded-lg bg-white">
              <Image
                src={current.image}
                alt={current.title}
                fill
                sizes="90vw"
                className="object-contain"
              />
            </div>
            <figcaption className="mt-3 text-center text-sm text-white/90">
              {t("imageCaption", { title: current.title })}
            </figcaption>
          </figure>
        </div>
      ) : null}
    </GalleryContext.Provider>
  );
}
