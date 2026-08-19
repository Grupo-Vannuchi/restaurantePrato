import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
import { richTags } from "@/i18n/rich";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";
import { ReserveButton } from "@/components/reserve-button";
import { ClosingCta } from "@/components/sections/closing-cta";
import { GalleryPreview } from "@/components/sections/gallery-preview";
import { fillYears, siteConfig } from "@/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "experiencia" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    ...localeMetadata(locale, "/experiencia"),
  };
}

/** Brand-checkmarked list used to render the bullet groups on this page. */
function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 flex flex-col gap-3">
      {items.map((item, i) => (
        <Reveal as="li" key={item} delay={(i % 6) * 60} className="flex gap-3">
          <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Check className="size-4" />
          </span>
          <span className="text-pretty leading-relaxed text-muted-foreground">
            {item}
          </span>
        </Reveal>
      ))}
    </ul>
  );
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("experiencia");
  const tc = await getTranslations("common");

  // A bullet mentions how long the house has been open; `fillYears` resolves it
  // from `foundedYear` so it can't drift out of sync with the rest of the site.
  // Wrapped rather than passed by reference: `.map` would feed the index in as
  // `fillYears`'s second argument.
  const audienceItems = (t.raw("audience.items") as string[]).map((item) =>
    fillYears(item),
  );
  const contactParagraphs = t.raw("contactCta.paragraphs") as string[];

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <Section>
        <p className="max-w-3xl text-pretty text-xl leading-relaxed">
          {/* "lead" tem o placeholder ICU {foundedYear} — sem ele o next-intl
              cai no fallback padrão (o nome literal da chave) em vez de
              lançar um erro, então o bug só aparece olhando a página. */}
          {t.rich("lead", { ...richTags, foundedYear: siteConfig.foundedYear })}
        </p>
      </Section>

      <Section className="border-y border-border bg-muted/30">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold">{t("audience.title")}</h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            {t.rich("audience.intro", richTags)}
          </p>
          <CheckList items={audienceItems} />
        </div>
      </Section>

      <ClosingCta
        title={t("contactCta.title")}
        actions={
          <>
            <Link
              href="/contato"
              className={buttonVariants({
                variant: "accent",
                size: "lg",
                className: "group",
              })}
            >
              {tc("talkToUs")}
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <ReserveButton
              variant="outline"
              size="lg"
              className="border-white/40 text-brand-foreground hover:bg-white/10"
              label={tc("reserveTable")}
            />
          </>
        }
        footer={
          <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
            {t("disclaimer")}
          </p>
        }
      >
        <div className="flex flex-col gap-3">
          {contactParagraphs.map((p, i) => (
            <p key={i} className="text-pretty leading-relaxed opacity-90">
              {p}
            </p>
          ))}
        </div>
      </ClosingCta>

      {/* §3.3 do briefing: a galeria do salão vive dentro desta página — não é
          item de menu. O time não aparece: a direção visual do cliente proíbe
          rostos de funcionários e clientes. */}
      <GalleryPreview locale={locale} />
    </>
  );
}
