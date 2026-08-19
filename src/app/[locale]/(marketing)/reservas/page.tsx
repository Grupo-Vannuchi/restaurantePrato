import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, MapPin, Sofa, Sunrise, Users } from "lucide-react";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { Section, SectionHeader } from "@/components/ui/section";
import { ReserveButton } from "@/components/reserve-button";
import { fullAddress, openingHoursLabel } from "@/config/site";

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

  const hours = openingHoursLabel();

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {/* Como está o salão ao longo do serviço — vem antes da seção de
         grupos porque a página passou a liderar com o horário, não com o
         convite para reservar (decisão do dono, 19/08: ver o commit "UPD:
         /reservas passa a liderar com o horario"). */}
      <Section>
        <SectionHeader title={t("practicalTitle")} align="left" />
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {/* `openingHoursLabel` já inclui os dias — ver o aviso na função. */}
          {hours ? (
            <Fact icon={Clock} label={t("hoursLabel")} value={hours} />
          ) : null}
          <Fact icon={MapPin} label={t("addressLabel")} value={fullAddress()} />
          <Fact
            icon={Sunrise}
            label={t("salaoEarlyLabel")}
            value={t("salaoEarlyValue")}
          />
          <Fact
            icon={Users}
            label={t("salaoPeakLabel")}
            value={t("salaoPeakValue")}
          />
          <Fact
            icon={Sofa}
            label={t("salaoLateLabel")}
            value={t("salaoLateValue")}
          />
        </div>
      </Section>

      {/* Reservas para grupos e eventos — o único convite de reserva que
         sobra na página; o botão avulso do topo foi removido de propósito. */}
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
    </>
  );
}
