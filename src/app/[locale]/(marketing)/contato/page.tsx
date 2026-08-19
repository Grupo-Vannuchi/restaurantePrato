import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail, Phone, MessageCircle, MapPin } from "lucide-react";
// lucide-react removeu ícones de marca (ver `brand-icons.tsx`); o rodapé já
// importa o Instagram de lá.
import { Instagram } from "@/components/ui/brand-icons";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/ui/section";
import { ContactForm } from "@/components/forms/contact-form";
import { ReserveButton } from "@/components/reserve-button";
import { fullAddress, phoneLink, siteConfig, whatsappLink } from "@/config/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: t("title"),
    description: t("subtitle"),
    ...localeMetadata(locale, "/contato"),
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const { contact } = siteConfig;

  const whatsapp = whatsappLink();
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress())}`;

  const channels: {
    icon: typeof Mail;
    label: string;
    value: string;
    href?: string;
  }[] = [
    { icon: Mail, label: t("labels.email"), value: contact.email, href: `mailto:${contact.email}` },
    // Só listado quando existe telefone — mesmo contrato do WhatsApp abaixo.
    ...(contact.phone
      ? [
          {
            icon: Phone,
            label: t("labels.phone"),
            value: contact.phone,
            href: phoneLink() ?? undefined,
          },
        ]
      : []),
    // Only listed once a number exists — see `hasWhatsapp()` in the site config.
    ...(whatsapp
      ? [
          {
            icon: MessageCircle,
            label: t("labels.whatsapp"),
            value: contact.whatsapp.display,
            href: whatsapp,
          },
        ]
      : []),
    // Só listado quando há perfil configurado — mesmo contrato do WhatsApp
    // acima. O rodapé já itera `siteConfig.social` sozinho.
    ...(siteConfig.social.instagram
      ? [
          {
            icon: Instagram,
            label: t("labels.instagram"),
            value: "@restaurante.prato",
            href: siteConfig.social.instagram,
          },
        ]
      : []),
    {
      icon: MapPin,
      label: t("labels.address"),
      value: `${contact.address.street}, ${contact.address.city} — ${contact.address.region}`,
      href: mapsLink,
    },
  ];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_340px]">
          <ContactForm />

          <aside className="flex flex-col gap-6">
            <h2 className="text-lg font-semibold">{t("infoTitle")}</h2>
            <ul className="flex flex-col gap-5">
              {channels.map((channel) => (
                <li key={channel.label} className="flex gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <channel.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {channel.label}
                    </p>
                    {channel.href ? (
                      <a
                        href={channel.href}
                        target={channel.href.startsWith("http") ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="text-sm transition-colors hover:text-brand"
                      >
                        {channel.value}
                      </a>
                    ) : (
                      <p className="text-sm">{channel.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-3">
              <ReserveButton />
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-brand underline-offset-4 hover:underline"
              >
                {t("route")}
              </a>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
