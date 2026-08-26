import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { InformationCard } from "@/components/information-card";
import { InformationGallery } from "@/components/information-gallery";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { getInformations } from "@/lib/queries";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "novidades" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    ...localeMetadata(locale, "/novidades"),
  };
}

export default async function InformationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("novidades");
  const informations = await getInformations(locale);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Section>
        {informations.length === 0 ? (
          <p className="text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          <InformationGallery items={informations}>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {informations.map((information, i) =>
                // A primeira fica fora da revelação — ver a nota em
                // `galeria/page.tsx`: esconder o LCP atrás da hidratação anula
                // a prioridade dada à imagem.
                i === 0 ? (
                  <div key={information.id} className="h-full">
                    <InformationCard information={information} priority />
                  </div>
                ) : (
                  <Reveal key={information.id} delay={(i % 4) * 80} className="h-full">
                    <InformationCard information={information} />
                  </Reveal>
                ),
              )}
            </div>
          </InformationGallery>
        )}
      </Section>
    </>
  );
}
