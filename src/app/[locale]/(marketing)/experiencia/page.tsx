import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
import { richTags } from "@/i18n/rich";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/page-header";
import { Section, SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";
import { ReserveButton } from "@/components/reserve-button";
import { ClosingCta } from "@/components/sections/closing-cta";
import { GalleryPreview } from "@/components/sections/gallery-preview";
import { MomentosDoSalao } from "@/components/sections/momentos-do-salao";
import { fillYears, siteConfig } from "@/config/site";
import { RotaBreadcrumbJsonLd } from "@/components/json-ld";

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
    <ul role="list" className="mt-5 flex flex-col gap-3">
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
  const tTrilha = await getTranslations({ locale, namespace: "nav" });
  const t = await getTranslations("experiencia");
  const tSalao = await getTranslations("salao");
  const tc = await getTranslations("common");

  // A bullet mentions how long the house has been open; `fillYears` resolves it
  // from `foundedYear` so it can't drift out of sync with the rest of the site.
  // Wrapped rather than passed by reference: `.map` would feed the index in as
  // `fillYears`'s second argument.
  const audienceItems = (t.raw("audience.items") as string[]).map((item) =>
    fillYears(item),
  );
  const contactParagraphs = t.raw("contactCta.paragraphs") as string[];
  /* Os dois parágrafos SEM placeholder da abertura — o primeiro tem o
     `{foundedYear}` e é lido por `t.rich` lá embaixo. */
  const leadParagraphs = t.raw("leadParagraphs") as string[];

  return (
    <>
      <RotaBreadcrumbJsonLd locale={locale} rota="/experiencia" nome={tTrilha("experiencia")} />

      {/* ⚠️ **Sem foto desde 25/09/2026, a pedido do cliente: "tire a foto desse
          background e deixe o fundo verde".** A faixa era `balcao-e-salao.webp`
          sob um véu escuro medido.

          `/contato` e `/reservas` continuam com foto — a troca foi pedida para
          esta página, e mudar as três sem pedir seria decidir a cara do site
          inteiro por conta própria. Se elas forem junto, é trocar `image` por
          `fundo="verde"` em cada uma, e a foto de ambiente de cada página perde
          o último lugar onde aparecia. */}
      <PageHeader title={t("title")} subtitle={t("subtitle")} fundo="verde" />

      {/* ⚠️ **Três parágrafos desde 28/09/2026, e era um só.** O dono trouxe
          uma copy nova para esta página, e ela vinha do projeto irmão: dois dos
          fatos que ela afirmava estão na lista de bloqueio de
          `test/brand-hygiene.test.ts`, o tempo de casa contradizia o ano de
          fundação que `siteConfig` guarda, e ela encerrava o almoço com um café
          que a carta de bebidas não tem. Esta é a mesma ESTRUTURA, reescrita só
          com o que está confirmado para o Prato.

          ⚠️ Os termos bloqueados não se repetem aqui de propósito: a varredura
          lê `src/` inteiro e reprovou a primeira versão deste comentário por
          citá-los para explicar a recusa. É a terceira vez que uma guarda deste
          repositório tropeça na própria prosa, e a regra já assentada é que
          quem cede é o texto — guarda de contaminação não aprende exceção. A
          lista está no teste; o registro do episódio, no commit.

          ⚠️ O placeholder `{foundedYear}` vive no primeiro parágrafo. Sem
          passá-lo, o next-intl não lança erro: ele cai no fallback e imprime o
          NOME da chave na página. `test/icu-placeholders.test.tsx` é o que
          pega isso antes de alguém ver. */}
      <Section>
        <div className="flex max-w-3xl flex-col gap-5">
          {/* O primeiro parágrafo é chave PRÓPRIA, e não o índice zero do
              array, porque só ele carrega o `{foundedYear}`. Endereçar um item
              de array por índice no `t.rich` é frágil, e o preço do erro aqui é
              o nome da chave impresso na página. */}
          <p className="text-pretty text-xl leading-relaxed">
            {t.rich("leadIntro", {
              ...richTags,
              foundedYear: siteConfig.foundedYear,
            })}
          </p>
          {leadParagraphs.map((paragrafo) => (
            <p key={paragrafo} className="text-pretty text-xl leading-relaxed">
              {paragrafo}
            </p>
          ))}
        </div>
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

      {/*
       * Os três momentos do salão, a MESMA lista que `/reservas` mostra na
       * grade de informação prática.
       *
       * ⚠️ **A repetição é deliberada e a fonte é uma.** Esta página responde
       * "como é almoçar aqui", e o ritmo do salão ao longo do serviço é
       * exatamente isso: cedo o buffet está intacto, ao meio-dia o Centro chega
       * inteiro, depois das 13h30 dá para comer sem pressa. Quem está decidindo
       * se vem precisa dessa informação aqui, e não só na página de horários.
       *
       * O projeto irmão tem a mesma informação escrita duas vezes, em namespaces
       * separados. Aqui as seis frases vivem uma vez, em `salao`, e as duas
       * páginas renderizam a mesma lista — o layout é que difere.
       */}
      <Section>
        <SectionHeader
          title={tSalao("title")}
          subtitle={tSalao("intro")}
          align="left"
        />
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <MomentosDoSalao />
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
              className="border-white/70 text-brand-foreground hover:bg-white/10"
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
            // Sem `opacity-90`, pelo mesmo motivo medido em `sections/cta.tsx`:
            // branco a 90% sobre o verde da marca dá 4,39:1, abaixo dos 4,5:1.
            <p key={i} className="text-pretty leading-relaxed">
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
