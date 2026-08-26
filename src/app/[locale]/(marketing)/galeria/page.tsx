import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { GalleryPhotoCard } from "@/components/gallery-photo-card";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { getGalleryPhotos } from "@/lib/queries";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "galeria" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    ...localeMetadata(locale, "/galeria"),
  };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("galeria");
  const photos = await getGalleryPhotos(locale);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Section>
        {photos.length === 0 ? (
          <p className="text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo, i) =>
              // A primeira foto fica FORA da revelação, pelo mesmo motivo que o
              // título das páginas internas saiu dela: `Reveal` nasce com
              // `opacity: 0` e só aparece depois de hidratar. Ela é o maior
              // elemento da tela — esconder o LCP atrás do JavaScript anula o
              // `priority` que acabou de ser dado a ela.
              i === 0 ? (
                <div key={photo.id} className="h-full">
                  <GalleryPhotoCard photo={photo} priority />
                </div>
              ) : (
                <Reveal key={photo.id} delay={(i % 3) * 90} className="h-full">
                  <GalleryPhotoCard photo={photo} />
                </Reveal>
              ),
            )}
          </div>
        )}
      </Section>
    </>
  );
}
