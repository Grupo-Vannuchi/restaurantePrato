"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

  const openAt = useCallback(
    (slug: string) => {
      const i = items.findIndex((it) => it.slug === slug);
      if (i >= 0) setIndex(i);
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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowRight") move(1);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
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
