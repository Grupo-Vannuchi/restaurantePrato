import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/sections/hero";
import { MenuPreview } from "@/components/sections/menu-preview";
import { GalleryPreview } from "@/components/sections/gallery-preview";
import { InstagramFeed } from "@/components/sections/instagram-feed";
import { Testimonials } from "@/components/sections/testimonials";
import { CTA } from "@/components/sections/cta";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";

// Statically rendered (ISR): the CMS-backed sections read tagged, cached
// queries, and the admin actions call `revalidateTag` on every edit — so the
// page stays static and fast while updating the instant content changes.

// Title/description are inherited from the locale layout's default metadata;
// this only adds the self-referencing canonical + hreflang for the home route.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  return { ...localeMetadata(locale, "") };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <MenuPreview locale={locale} />
      <GalleryPreview locale={locale} />
      {/* Continuação da galeria, não seção institucional. Não renderiza nada
          enquanto as credenciais não chegarem — ver `lib/instagram.ts`. */}
      <InstagramFeed />
      <Testimonials locale={locale} />
      <CTA />
    </>
  );
}
