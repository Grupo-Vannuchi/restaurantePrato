import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MenuHero } from "@/components/cardapio/menu-hero";
import { PageHeader } from "@/components/page-header";
import { Section, SectionHeader } from "@/components/ui/section";
import { DayTabs } from "@/components/cardapio/day-tabs";
import { DishRow } from "@/components/cardapio/dish-row";
import { PriceCallout } from "@/components/cardapio/price-callout";
import { agrupadosPorCategoria, pratosDoDia } from "@/lib/cardapio";
import { WEEKDAYS, isWeekday, precoDaMassa, precoDoBuffet } from "@/config/menu";
import { weekdayNoRestaurante } from "@/lib/dates";
import { getBuffetDishes, getPastaDishes } from "@/lib/queries";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "cardapio" });
  return {
    title: t("title"),
    description: t("metaDescription"),
    ...localeMetadata(locale, "/cardapio"),
  };
}

export default async function CardapioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("cardapio");

  // Independentes: buscar em sequência só somaria latência.
  const [buffet, massas] = await Promise.all([
    getBuffetDishes(locale),
    getPastaDishes(locale),
  ]);

  const rotulos = Object.fromEntries(
    WEEKDAYS.map((d) => [d, t(`weekday${d}` as "weekday1")]),
  );

  /*
   * O dia de hoje resolvido no fuso do restaurante, e `null` no fim de semana.
   * `weekdayNoRestaurante` devolve 6 e 7 no sábado e no domingo, que não são
   * dias de cardápio — as abas caem na segunda, porque abrir em branco seria
   * pior que abrir no primeiro dia útil.
   */
  const hojeNaSemana = weekdayNoRestaurante();
  const hoje = isWeekday(hojeNaSemana) ? hojeNaSemana : null;

  return (
    <>
      {/* A identidade antes da lista: quem chega aqui pode ter escaneado um
          código na mesa e nunca ter visto o site. */}
      <MenuHero />
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {/* Coluna estreita: um cardápio é lido de cima a baixo, não varrido em
          grade. `max-w-3xl` mantém a linha na faixa confortável de leitura
          mesmo num monitor largo. */}
      <Section containerClassName="max-w-3xl">
        {/* Some inteiro enquanto os preços não vierem do cliente — ver
            `price-callout.tsx`. */}
        <PriceCallout buffet={precoDoBuffet()} massa={precoDaMassa()} />

        {buffet.length === 0 ? (
          <p className="text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="mt-10">
            <DayTabs
              labels={rotulos}
              todayLabel={t("today")}
              selectorLabel={t("daySelectorLabel")}
              today={hoje}
            >
              {WEEKDAYS.map((dia) => {
                const pratos = pratosDoDia(buffet, dia);
                if (pratos.length === 0) {
                  return (
                    <p key={dia} className="text-center text-muted-foreground">
                      {t("emptyDay")}
                    </p>
                  );
                }
                return (
                  <div key={dia} className="flex flex-col gap-8">
                    {agrupadosPorCategoria(pratos).map((grupo) => (
                      <section key={grupo.categoria.slug}>
                        {/* `h2`, e não `h3`: acima só existe o `h1` da
                            página, e o nome do PRATO já é `h3` na linha. Com
                            `h3` aqui, a página pulava de h1 para h3 e a
                            categoria ficava no mesmo nível dos pratos que ela
                            agrupa. */}
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          {grupo.categoria.name}
                        </h2>
                        <ul className="overflow-hidden rounded-2xl border border-border bg-card">
                          {grupo.pratos.map((prato) => (
                            <DishRow key={prato.id} dish={prato} />
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                );
              })}
            </DayTabs>
          </div>
        )}
      </Section>

      {/* Massas: seção própria porque o preço é outro. Ela some quando não há
          massa cadastrada, em vez de anunciar uma ilha vazia. */}
      {massas.length > 0 ? (
        <Section
          id="massas"
          className="border-t border-border bg-muted/30"
          containerClassName="max-w-3xl"
        >
          <SectionHeader
            title={t("pastaLabel")}
            subtitle={t("pastaNote")}
            align="left"
          />
          <ul className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
            {massas.map((prato) => (
              <DishRow key={prato.id} dish={prato} />
            ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
