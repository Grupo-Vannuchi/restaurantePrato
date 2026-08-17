import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, CreditCard, MapPin, Landmark } from "lucide-react";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { Section, SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { ReserveButton } from "@/components/reserve-button";
import { fullAddress, siteConfig } from "@/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "reservas" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    ...localeMetadata(locale, "/reservas"),
  };
}

type BestTime = { when: string; what: string };

/** One line of the "practical information" list. */
function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-pretty text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

export default async function ReservasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("reservas");

  const bestTime = t.raw("bestTime") as BestTime[];
  const { openingHours, contact } = siteConfig;
  const hours = `${t("hoursTitle")}`;

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {/* 5.1 — Horários + "melhor momento para você" */}
      <Section>
        <SectionHeader
          title={t("hoursTitle")}
          subtitle={t("bestTimeTitle")}
          align="left"
        />
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {bestTime.map((slot, i) => (
            <Reveal
              as="li"
              key={slot.when}
              delay={i * 90}
              className="flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-6"
            >
              <span className="text-xl font-bold text-brand">{slot.when}</span>
              <span className="text-pretty leading-relaxed text-muted-foreground">
                {slot.what}
              </span>
            </Reveal>
          ))}
        </ol>
        <div className="mt-10">
          <ReserveButton size="lg" />
        </div>
      </Section>

      {/* 5.2 — Reservas para grupos e eventos */}
      <Section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {t("groupsTitle")}
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
            {t("groupsCopy")}
          </p>
          <div className="mt-8 flex justify-center">
            <ReserveButton size="lg" message={t("groupsMessage")} />
          </div>
        </div>
      </Section>

      {/* 5.3 — Informações práticas */}
      <Section>
        <SectionHeader title={t("practicalTitle")} align="left" />
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <Fact icon={Clock} label={t("hoursLabel")} value={hours} />
          <Fact icon={CreditCard} label={t("paymentsLabel")} value={t("payments")} />
          <Fact icon={MapPin} label={t("addressLabel")} value={fullAddress()} />
          <Fact icon={Landmark} label={t("accessLabel")} value={t("access")} />
        </div>
        {contact.phone ? (
          <p className="sr-only">
            {`${openingHours.opens}–${openingHours.closes} · ${contact.phone}`}
          </p>
        ) : null}
      </Section>
    </>
  );
}
