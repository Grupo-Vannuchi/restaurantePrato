import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock, CreditCard, MapPin } from "lucide-react";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/page-header";
import {
  PhotoCarousel,
  type CarouselPhoto,
} from "@/components/photo-carousel";
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

  // `raw` porque `photos` e um ARRAY; `t()` devolveria a chave crua.
  const fotos = t.raw("photos") as CarouselPhoto[];
  const hours = openingHoursLabel();

  return (
    <>
      <RotaBreadcrumbJsonLd locale={locale} rota="/reservas" nome={tTrilha("reservas")} />

      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        /* ⚠️ **Faixa verde desde 01/10/2026, a pedido do dono ("mesma
           estrutura do fogão de ouro").** Lá o cabeçalho desta página é uma
           faixa chapada na cor da marca, não uma foto — e faz sentido aqui por
           outro motivo: o carrossel logo abaixo abre com o salão, igual à que
           estava aqui. Duas imagens parecidas em sequência leem como falha de
           carregamento.

           `/ambiente/salao.webp` ficou sem consumidor e está declarada em
           GUARDADAS, em `test/a-galeria-mostra-comida.test.ts`. */
        fundo="verde"
      />

      {/* ⚠️ **Carrossel do salão e do serviço, a pedido do dono em 30/09/2026,
          para a página ficar com a mesma estrutura da do projeto irmão** — era
          a única superfície de foto que lá existia e aqui não.

          Abre com o BALCÃO, não com o salão, e isso é regra que o irmão
          escreveu antes de nós: a foto do cabeçalho logo acima já é o salão, e
          duas imagens parecidas em sequência leem como falha de carregamento.
          Depois disso alterna serviço / salão / serviço / salão.

          As quatro vivem em `pt.json` e não aqui porque são conteúdo, não
          leiaute — mesmo lugar onde o irmão as guarda. `t.raw` porque é um
          array; `t()` devolveria a chave. */}
      <Section>
        <PhotoCarousel
          photos={fotos}
          /*
           * Medido na caixa DESTA página, que não é a da ilha de massas: aqui o
           * carrossel ocupa a largura cheia do `Container` (`max-w-6xl`, 1152,
           * com recuo de 20 px no celular e 32 de `sm` para cima), enquanto lá
           * ele vive numa seção `max-w-3xl`. Daí 1088 px a partir de 1216 de
           * tela, que é onde o limite do container passa a mandar. Ver a nota
           * sobre `sizes` ser prop em `components/photo-carousel.tsx`.
           */
          sizes="(min-width: 1216px) 1088px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 40px)"
          labels={{
            carousel: t("carousel"),
            prev: t("prevPhoto"),
            next: t("nextPhoto"),
            // O rótulo de cada marcador é montado no cliente, que não tem o
            // catálogo: mandamos o molde e ele troca o {n}.
            goTo: t("goToPhoto", { n: "{n}" }),
          }}
        />
        {/* ⚠️ **O convite entra logo abaixo do carrossel, como no irmão.**
            Antes a página passava inteira sem uma só chamada para ação até a
            faixa de eventos, lá embaixo: quem chegou para reservar tinha de
            rolar tudo para achar como. */}
        <div className="mt-12">
          <ReserveButton size="lg" />
        </div>
      </Section>

      {/* Como está o salão ao longo do serviço — vem antes da seção de
         grupos porque a página passou a liderar com o horário, não com o
         convite para reservar (decisão do dono, 19/08: ver o commit "UPD:
         /reservas passa a liderar com o horario"). */}
      {/* ⚠️ **Foto de fundo desde 01/10/2026, a pedido do dono.** A faixa era
          creme sobre creme e fechava a página sem peso nenhum.

          ⚠️ **`salao` desde 05/10/2026, a pedido do dono: ele quis uma foto
          do SALÃO aqui.** A faixa usava `balcao-e-salao`, que mostra o
          balcão frio em primeiro plano — e numa seção que convida a reservar
          espaço para um grupo, o que precisa aparecer é o lugar de sentar.

          As duas trocaram de papel: `salao` estava em GUARDADAS desde 01/10,
          quando o cabeçalho desta página virou faixa verde, e `balcao-e-salao`
          entra lá no lugar dela. A lista registra o que está parado AGORA.

          O véu é CHAPADO, e não o degradê do `page-header`: ali o texto é
          alinhado à esquerda e o degradê escurece justamente aquele lado; aqui
          ele é centralizado, e um degradê lateral deixaria metade da frase
          sobre a parte clara da foto. Medido pela varredura de contraste. */}
      <Section className="relative isolate flex min-h-[30rem] items-center overflow-hidden border-y border-border sm:min-h-[36rem]">
        <Image
          src="/ambiente/salao.webp"
          alt=""
          fill
          sizes="100vw"
          quality={50}
          className="-z-10 object-cover"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-foreground/82" />
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-background sm:text-4xl">
            {t("groupsTitle")}
          </h2>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-background/85">
            {t("groupsCopy")}
          </p>
          <div className="mt-8 flex justify-center">
            {/* Rótulo PRÓPRIO, a pedido do dono em 02/10: o padrão do botão é
                "Fazer minha reserva", que fala de mesa para uma pessoa. Esta
                faixa é de grupos e eventos, e o convite muda junto. */}
            <ReserveButton
              size="lg"
              label={t("groupsButton")}
              message={t("groupsMessage")}
            />
          </div>
        </div>
      </Section>

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
    </>
  );
}
