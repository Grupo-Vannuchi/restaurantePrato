import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, CreditCard, MapPin } from "lucide-react";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import { Section, SectionHeader } from "@/components/ui/section";
import { ReserveButton } from "@/components/reserve-button";
import {
  Fact,
  MomentosDoSalao,
} from "@/components/sections/momentos-do-salao";
import { siteConfig, fullAddress, openingHoursLabel } from "@/config/site";
import { RotaBreadcrumbJsonLd } from "@/components/json-ld";

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

export default async function ReservasPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const tTrilha = await getTranslations({ locale, namespace: "nav" });
  const t = await getTranslations("reservas");

  const hours = openingHoursLabel();

  return (
    <>
      <RotaBreadcrumbJsonLd locale={locale} rota="/reservas" nome={tTrilha("reservas")} />

      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        image="/ambiente/salao.webp"
        imageAlt={t("headerAlt")}
      />

      {/* Como está o salão ao longo do serviço — vem antes da seção de
         grupos porque a página passou a liderar com o horário, não com o
         convite para reservar (decisão do dono, 19/08: ver o commit "UPD:
         /reservas passa a liderar com o horario"). */}
      <Section>
        <SectionHeader title={t("practicalTitle")} align="left" />
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {/* `openingHoursLabel` já inclui os dias — ver o aviso na função. */}
          {hours ? (
            <Fact icon={Clock} label={t("hoursLabel")} value={hours} />
          ) : null}
          <Fact
            icon={MapPin}
            label={t("addressLabel")}
            value={fullAddress()}
            // Some sozinha sem referencia configurada — ver `config/site.ts`.
            note={siteConfig.contact.address.landmark}
          />
          {/*
            ⚠️ **Os meios de pagamento estavam SÓ no dado estruturado.**
            Confirmados pelo cliente em 17/09/2026, eles saíam no
            `paymentAccepted` do `Restaurant` — a máquina lia, o visitante não.
            A auditoria de 21/09 varreu a saída publicada e achou as cinco
            palavras exclusivamente dentro do `<script>` de schema.

            Num restaurante por quilo isto não é enfeite: "aceita VR?" é uma das
            perguntas que decidem se a pessoa atravessa a rua. Mesma fonte do
            schema, então os dois nunca divergem — e some sozinho se a lista
            esvaziar, como todo dado de cliente aqui.
          */}
          {siteConfig.paymentAccepted?.length ? (
            <Fact
              icon={CreditCard}
              label={t("paymentLabel")}
              value={siteConfig.paymentAccepted.join(" · ")}
            />
          ) : null}
          {/* Os três momentos do salão, agora compartilhados com
              `/experiencia`: uma fonte só para as seis frases. Ver o aviso em
              `components/sections/momentos-do-salao.tsx`. */}
          <MomentosDoSalao />
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
