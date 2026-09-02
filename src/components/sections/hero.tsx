import { getTranslations } from "next-intl/server";
import { fillYears, yearsInBusiness } from "@/config/site";
import { HeroCarousel, type HeroSlide } from "@/components/sections/hero-carousel";

/**
 * Hero carousel background images — self-hosted under `/public/hero` so
 * `next/image` serves optimized AVIF/WebP from the SAME origin (faster LCP than
 * fetching from a remote host). One per slide, matched by index to the copy in
 * `home.hero.slides`.
 *
 * ⚠️ EMPTY ON PURPOSE. The client's brief requires 100% authorial photography
 * (close-ups of food on the brasa, the renovated dining room) and none has been
 * delivered yet. Until then the carousel falls back to a brand gradient — stock
 * imagery would misrepresent the restaurant, and the previous brand's photos
 * literally carried its logo in frame.
 *
 * To ship the real photos: drop three WebP files here, keep them roughly the
 * same weight (~100–230 KB), and list them below. Slide 1 is the home page LCP.
 */
const slideImages: string[] = [];

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
