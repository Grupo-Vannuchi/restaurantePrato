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
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import {
  mapEmbedUrl,
  openingHoursLabel,
  phoneLink,
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
        /* ⚠️ **Recortada para a PLACA ficar no centro vertical, em 01/10/2026.
           O dono pediu uma fachada que mostrasse o nome, e trocar o arquivo
           sozinho não resolvia.** A faixa do cabeçalho é de ~5:1 e usa
           `object-cover`: ela preserva só a fatia do meio, e nas duas fotos
           anteriores a placa ficava no terço de cima — cortada fora, sobrando
           toldo. O arquivo em `public/ambiente` já vem recortado de 0 a 620 da
           origem, o que põe a placa no meio e a mantém em qualquer largura.
           Mexer no `object-position` resolveria só aqui e mudaria um
           componente que /reservas e /experiencia também usam. */
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
        {/* ⚠️ **Serifada e maior desde 01/10/2026, a pedido do dono: "a mesma
            estrutura do fogão de ouro".** Lá este título é `font-serif` em
            2xl/3xl; aqui era `text-lg font-semibold`, do tamanho de um rótulo,
            e não lia como abertura de seção. */}
        {/* ⚠️ **`mx-auto` a pedido do dono, 01/10/2026.** O título e a lista
            tinham `max-w-3xl` SEM centralizar, então o bloco encostava à
            esquerda de um container de 1152 enquanto os botões logo abaixo já
            vinham centralizados — o conjunto lia torto. O texto dentro segue
            alinhado à esquerda, como no projeto irmão: o que se centraliza é o
            BLOCO, não a leitura. Centralizar rótulo e valor desalinharia as
            duas colunas da ficha, que é o que a torna varrível. */}
        <div className="mx-auto max-w-3xl">
        <h2 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
          {t("infoTitle")}
        </h2>

        {/* ⚠️ **Era uma grade de três cartões; virou lista de rótulo à esquerda
            e valor à direita, como a do irmão.** A grade espalhava cinco itens
            curtos por três colunas e deixava a última fila pela metade. A
            lista ocupa a largura toda sem buraco e lê como uma ficha: a pessoa
            varre os rótulos de cima a baixo e para no que procura.

            `max-w-3xl` porque rótulo e valor nas pontas de 1152 px separam os
            dois por meia tela, e aí a linha deixa de ser um par.

            Os pares quebram em duas linhas no celular (`sm:flex-row`): lado a
            lado numa tela de 320, o e-mail não caberia. O `min-w-0` com o
            `break-words` continua sendo o par que impede a palavra única do
            e-mail de empurrar a página — era defeito real, não precaução. */}
        <ul role="list" className="mt-8 divide-y divide-border border-y border-border">
          {channels.map((channel) => (
            <li key={channel.label}>
              {channel.href ? (
                <a
                  href={channel.href}
                  target={channel.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex flex-col gap-1 py-4 transition-colors hover:text-brand focus-visible:text-brand sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <span className="flex items-center gap-3 text-sm text-muted-foreground">
                    <channel.icon className="size-4 shrink-0 text-brand" aria-hidden />
                    {channel.label}
                  </span>
                  <span className="min-w-0 break-words text-sm sm:text-right">
                    {channel.value}
                  </span>
                </a>
              ) : (
                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <span className="flex items-center gap-3 text-sm text-muted-foreground">
                    <channel.icon className="size-4 shrink-0 text-brand" aria-hidden />
                    {channel.label}
                  </span>
                  <span className="min-w-0 break-words text-sm sm:text-right">
                    {channel.value}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
        </div>
        {/* ⚠️ **Dois botões centralizados desde 01/10/2026, a pedido do dono:
            "a mesma estrutura do fogão de ouro".** Aqui eram três coisas
            alinhadas à esquerda com pesos diferentes — um botão e dois links de
            texto — e o olho não achava a ação principal.

            ⚠️ **O primeiro leva a `/reservas`, e NÃO abre o WhatsApp.** É a
            decisão que o irmão tomou em 24/09: quem clica aqui quer saber
            horário e como funciona antes de mandar mensagem, e a página
            responde isso. O atalho direto não se perdeu — é o segundo botão.

            ⚠️ **O convite para avaliar no Google saiu deste par.** Ele continua
            no rodapé, onde esse tipo de pedido incomoda menos; aqui ocupava o
            lugar da ação que a página existe para oferecer. Mesma decisão do
            irmão, e o link do mapa saiu junto: o próprio mapa logo abaixo já
            tem o "Abrir no Maps". */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/reservas" className={buttonVariants({ size: "lg" })}>
            {tComum("reserveTable")}
          </Link>
          {/* Guardado na const acima: `whatsappLink()` devolve `string | null`,
              e chamá-la de novo faria o TypeScript perder o estreitamento que
              este `if` acabou de fazer. Sem número configurado, o botão some —
              mesmo contrato dos CTAs de ligar, que somem porque a casa não tem
              telefone fixo. */}
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <MessageCircle className="size-5" aria-hidden />
              {tComum("contactUs")}
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
      {/* Fundo apagado e borda no topo, como no irmão: separa o formulário
          do mapa sem precisar de título. */}
      <Section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-3xl">
          <ContactForm />
        </div>
      </Section>
    </>
  );
}
