import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MenuHero } from "@/components/cardapio/menu-hero";
import { PageHeader } from "@/components/page-header";
import { Section, SectionHeader } from "@/components/ui/section";
import { DayTabs } from "@/components/cardapio/day-tabs";
import { DishRow } from "@/components/cardapio/dish-row";
import { PriceCallout } from "@/components/cardapio/price-callout";
import { DessertList } from "@/components/cardapio/dessert-list";
import { PastaBuilder } from "@/components/cardapio/pasta-builder";
import { WineList } from "@/components/cardapio/wine-list";
import { DrinkList } from "@/components/cardapio/drink-list";
import { agrupadosPorCategoria, pratosDoDia } from "@/lib/cardapio";
import {
  WEEKDAYS,
  desserts,
  drinkGroups,
  pastaExtras,
  pastaPhotos,
  wines,
  isWeekday,
  precoDaMassa,
  precoDoBuffet,
} from "@/config/menu";
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

  /** `null` enquanto o valor da porção não vier do cliente. */
  const precoMassa = precoDaMassa();

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

      {/* Massas: seção própria porque o preço é outro.

          ⚠️ Ela NÃO depende mais de haver massa cadastrada. Dependia, e com o
          banco vazio nunca era desenhada — quem lia o cardápio não descobria
          que a ilha existe, que é justamente o que faria alguém atravessar o
          salão até ela. O passo a passo vem do cardápio da casa, que é código.

          O preço vai no próprio título: quem rolou até aqui não deveria
          precisar voltar ao topo para lembrar quanto custa. Sem preço
          configurado, o título sai só com o rótulo em vez de sair com um vazio
          pendurado num travessão. */}
      <Section
        id="massas"
        className="border-t border-border bg-muted/30"
        containerClassName="max-w-3xl"
      >
        <SectionHeader
          title={precoMassa ? `${t("pastaLabel")} — ${precoMassa}` : t("pastaLabel")}
          subtitle={t("pastaNote")}
          align="left"
        />

        {/* Massas cadastradas no painel, quando houver. O passo a passo abaixo
            é o serviço da ilha e independe delas. */}
        {massas.length > 0 ? (
          <ul className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
            {massas.map((prato) => (
              <DishRow key={prato.id} dish={prato} />
            ))}
          </ul>
        ) : null}

        <PastaBuilder extras={pastaExtras} photos={pastaPhotos} />
      </Section>

      {/* Sobremesas: não pertencem a um dia — saem todo dia, do mesmo balcão.
          Some inteira enquanto a lista estiver vazia: uma vitrine de sobremesas
          sem sobremesa nenhuma promete o que a página não tem. */}
      {desserts.length > 0 ? (
        <Section containerClassName="max-w-3xl">
          <SectionHeader
            title={t("dessertsLabel")}
            subtitle={t("dessertsNote")}
            align="left"
          />
          <DessertList />
        </Section>
      ) : null}

      {/* Bebidas: fecha a página porque é o que se pede por último. Segunda
          seção com preço por linha, pela mesma razão da sobremesa — nenhuma
          das duas entra no valor por quilo. */}
      {drinkGroups.length > 0 ? (
        <Section
          id="bebidas"
          className="border-t border-border bg-muted/30"
          containerClassName="max-w-3xl"
        >
          <SectionHeader
            title={t("drinksLabel")}
            subtitle={t("drinksNote")}
            align="left"
          />
          <DrinkList />
        </Section>
      ) : null}

      {/* Carta de vinhos: seção própria porque o vinho não é bebida de balcão.
          Tem rótulo, procedência e uma escolha por trás, e sai em três doses —
          então um rótulo tem vários preços, o que não cabe no formato de uma
          linha por preço das bebidas.

          Ela aparece mesmo sem rótulo cadastrado: nesse caso o componente
          escreve a linha de apoio, que diz que a carta existe e ainda não foi
          digitada. Sumir aqui esconderia do visitante que a casa serve vinho. */}
      <Section containerClassName="max-w-3xl">
        <SectionHeader
          title={t("winesLabel")}
          subtitle={t("winesNote")}
          align="left"
        />
        {/* A foto abre a seção, como no projeto irmão: vinho é escolha, e uma
            garrafa na mesa do salão diz isso melhor que uma lista de preços.
            Decorativa — a carta abaixo é que informa, e o `alt` preenchido
            faria o leitor de tela anunciar uma imagem antes dos rótulos. */}
        <Image
          src="/bebidas/vinho-na-mesa.webp"
          alt=""
          width={1400}
          height={933}
          loading="lazy"
          sizes="(min-width: 1280px) 768px, 100vw"
          className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover"
        />
        <WineList wines={wines} />
      </Section>
    </>
  );
}
