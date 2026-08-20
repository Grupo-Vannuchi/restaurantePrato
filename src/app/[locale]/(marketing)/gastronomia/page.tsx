import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/page-header";
import { MenuItemCard } from "@/components/menu-item-card";
import { ClosingCta } from "@/components/sections/closing-cta";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { getMenu } from "@/lib/queries";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "gastronomia" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    ...localeMetadata(locale, "/gastronomia"),
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("gastronomia");
  const categories = await getMenu(locale);

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {categories.length === 0 ? (
        <Section>
          <p className="text-center text-muted-foreground">{t("empty")}</p>
        </Section>
      ) : (
        categories.map((category) => (
          <Section key={category.id} id={category.slug}>
            <SectionHeader
              title={category.name}
              subtitle={category.description}
              align="left"
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {category.items.map((item, i) => (
                <Reveal key={item.id} delay={(i % 3) * 90} className="h-full">
                  <MenuItemCard item={item} />
                </Reveal>
              ))}
            </div>
          </Section>
        ))
      )}
      {/* Quem terminou de ler o cardápio quer saber a que horas pode vir, não
          reservar mesa. A conversão por WhatsApp continua no `WhatsappButton`
          flutuante do layout de marketing, presente em toda página. */}
      <ClosingCta
        title={t("ctaTitle")}
        actions={
          <Link
            href="/reservas"
            className={buttonVariants({
              variant: "accent",
              size: "lg",
              className: "group",
            })}
          >
            {t("ctaButton")}
            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        }
      >
        <p className="text-pretty opacity-90">{t("ctaSubtitle")}</p>
      </ClosingCta>
    </>
  );
}
