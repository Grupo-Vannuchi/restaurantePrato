import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail, Phone, MessageCircle, MapPin, Landmark, Clock } from "lucide-react";
// lucide-react removeu ícones de marca (ver `brand-icons.tsx`); o rodapé já
// importa o Instagram de lá.
import { Instagram } from "@/components/ui/brand-icons";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/ui/section";
import { ContactForm } from "@/components/forms/contact-form";
import { MapEmbed } from "@/components/layout/map-embed";
import { ReserveButton } from "@/components/reserve-button";
import {
  mapEmbedUrl,
  openingHoursLabel,
  phoneLink,
  reviewLink,
  siteConfig,
  whatsappLink,
  mapLink,
} from "@/config/site";
import { RotaBreadcrumbJsonLd } from "@/components/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: t("title"),
    description: t("metaDescription"),
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
  const tTrilha = await getTranslations({ locale, namespace: "nav" });
  const t = await getTranslations("contact");
  const tRodape = await getTranslations("footer");
  const tComum = await getTranslations("common");
  const avaliar = reviewLink();
  const { contact } = siteConfig;

  const whatsapp = whatsappLink();
  const horario = openingHoursLabel();
  const mapsLink = mapLink();

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
    /*
     * O ponto de referencia entra como item PROPRIO, e nao colado no endereco.
     *
     * Duas razoes: o endereco e o link do mapa, e alongar o texto do link piora
     * o alvo de toque; e quem chega de fora procura primeiro pelo marco — "e
     * perto da Praca Maua?" — e nao pela numeracao da rua. Como item, ele tem
     * rotulo proprio e se le antes.
     *
     * Sem `href`: nao e um canal, e a mesma razao pela qual o horario entra sem
     * link logo abaixo. Some inteiro sem referencia configurada.
     */
    ...(contact.address.landmark
      ? [
          {
            icon: Landmark,
            label: t("labels.landmark"),
            value: contact.address.landmark,
          },
        ]
      : []),
    /*
     * O horário fecha a lista, e entra sem `href` porque não é um canal: é a
     * resposta para "estão abertos agora?", que é a outra metade do que alguém
     * procura ao abrir a página de contato. O campo `href` é opcional na lista
     * justamente para isto.
     *
     * ⚠️ Vem de `openingHoursLabel()`, nunca montado à mão: o helper já inclui
     * a faixa de DIAS, e formatar a partir de `opens`/`closes` publicaria "das
     * 11h às 15h" sem dizer que a casa fecha no fim de semana. Some sozinho se
     * o horário sair da configuração.
     */
    ...(horario ? [{ icon: Clock, label: t("labels.hours"), value: horario }] : []),
  ];

  return (
    <>
      <RotaBreadcrumbJsonLd locale={locale} rota="/contato" nome={tTrilha("contato")} />

      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        image="/ambiente/fachada.webp"
        imageAlt={t("headerAlt")}
      />

      {/* ⚠️ **A ordem é canais → mapa → formulário, e mudou em 24/09/2026 a
          pedido do cliente.** Antes o mapa abria a página e o formulário dividia
          uma grade de duas colunas com os canais, num aside de 340 px.

          A leitura que sustenta a ordem nova: quem abre `/contato` quase sempre
          quer o WhatsApp ou o endereço, não escrever um e-mail. Os canais em
          primeiro entregam isso sem rolagem; o mapa responde "onde fica" logo
          abaixo; e o formulário, que é o caminho mais lento e o menos usado num
          restaurante, fecha a página em vez de ocupar a primeira dobra.

          O mapa continua ANTES do formulário, que era a razão original de ele
          subir, e continua sumindo do rodapé aqui para não repetir — ver
          `footer-map.tsx`. O título vem do namespace do rodapé de propósito: é a
          mesma frase, e duplicá-la criaria dois lugares para manter. */}
      <Section>
        <h2 className="text-lg font-semibold">{t("infoTitle")}</h2>
        {/* Os canais eram uma coluna estreita; soltos na largura da página
            precisam de grade, senão viram uma fileira única de itens curtos com
            um rio de espaço em branco à direita. */}
        <ul role="list" className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel) => (
            <li key={channel.label} className="flex gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <channel.icon className="size-5" />
              </span>
              {/* `min-w-0` autoriza esta coluna a encolher abaixo do
                  conteúdo dela; sem isso o e-mail, que é uma palavra só,
                  define a largura mínima da linha e empurra a página. O
                  `break-words` nos valores é o outro lado do mesmo par —
                  um sem o outro não resolve. */}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {channel.label}
                </p>
                {channel.href ? (
                  <a
                    href={channel.href}
                    target={channel.href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="break-words text-sm transition-colors hover:text-brand"
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
        {/* Empilhados no celular, em linha a partir do `sm`: soltos na largura
            da página eles ficariam um por linha com a página inteira vazia ao
            lado. */}
        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
          <ReserveButton />
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-brand underline-offset-4 hover:underline"
          >
            {t("route")}
          </a>
          {/* Convite para avaliar no Google. Sai da configuração, nunca
              escrito aqui, e só aparece quando há URL — sem página no
              Google, sem botão. Mesmo contrato dos botões de ligar, que
              somem porque o restaurante não tem telefone fixo. */}
          {avaliar ? (
            <a
              href={avaliar}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-brand underline-offset-4 hover:underline"
            >
              {tComum("reviewCta")}
            </a>
          ) : null}
        </div>
      </Section>

      <Section className="pt-0 sm:pt-0">
        <div className="mx-auto max-w-3xl">
          <MapEmbed src={mapEmbedUrl()} title={tRodape("mapTitle")} />
        </div>
      </Section>

      {/* A mesma largura do mapa, e não a da página: um formulário de 1280 px
          põe o rótulo de um campo a meia tela do campo seguinte. */}
      <Section>
        <div className="mx-auto max-w-3xl">
          <ContactForm />
        </div>
      </Section>
    </>
  );
}
