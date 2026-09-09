import { getTranslations } from "next-intl/server";
import { fillYears, yearsInBusiness } from "@/config/site";
import { HeroCarousel, type HeroSlide } from "@/components/sections/hero-carousel";

/**
 * Hero carousel background images — self-hosted under `/public/hero` so
 * `next/image` serves optimized AVIF/WebP from the SAME origin (faster LCP than
 * fetching from a remote host). One per slide, matched by index to the copy in
 * `home.hero.slides`.
 *
 * As fotos do cliente chegaram em 03/09/2026 e são autorais: fotografadas no
 * salão, no balcão e na fachada do proprio Prato. Nada de banco de imagens —
 * foto genérica de buffet descreveria outro restaurante.
 *
 * Hoje a copy tem UM slide, então há uma imagem só. O buffet quente foi a
 * escolhida porque é o que a frase promete primeiro: "um buffet completo,
 * sempre quentinho". Ela é o LCP da home, e por isso está em 1600 px e ~180 KB
 * — mais que isso atrasa a primeira pintura no celular do Centro.
 *
 * Para acrescentar slides: solte o WebP aqui, mantenha o peso na mesma faixa
 * (~100–230 KB) e liste abaixo, na ordem da copy em `home.hero.slides`.
 */
const slideImages: string[] = ["/hero/buffet-quente.webp"];

export async function Hero() {
  const t = await getTranslations("home.hero");
  const copy = t.raw("slides") as { title: string; subtitle: string }[];

  const slides: HeroSlide[] = copy.map((slide, i) => ({
    title: slide.title,
    // The eyebrow computes the age from `foundedYear`; a slide that hardcoded it
    // would drift out of sync every January and contradict the badge sitting
    // right above it.
    subtitle: fillYears(slide.subtitle),
    image: slideImages.length
      ? slideImages[i % slideImages.length]
      : undefined,
  }));

  return (
    <HeroCarousel
      slides={slides}
      eyebrow={t("eyebrow", { years: yearsInBusiness() })}
      primaryCta={t("primaryCta")}
      secondaryCta={t("secondaryCta")}
      labels={{
        carousel: t("carouselLabel"),
        prev: t("prevSlide"),
        next: t("nextSlide"),
        goTo: slides.map((_, i) => t("goToSlide", { n: i + 1 })),
        pause: t("pauseSlides"),
        play: t("playSlides"),
      }}
    />
  );
}
