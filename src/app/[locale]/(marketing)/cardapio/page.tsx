import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MenuHero } from "@/components/cardapio/menu-hero";
import { MenuPhoto } from "@/components/cardapio/menu-photo";
import { MenuBackdrop } from "@/components/cardapio/menu-backdrop";
import { MenuSection } from "@/components/cardapio/menu-section";
import { DayTabs } from "@/components/cardapio/day-tabs";
import { DishRow } from "@/components/cardapio/dish-row";
import { PriceCallout } from "@/components/cardapio/price-callout";
import { DessertList } from "@/components/cardapio/dessert-list";
import { PastaBuilder } from "@/components/cardapio/pasta-builder";
import { WineList } from "@/components/cardapio/wine-list";
import { DrinkList } from "@/components/cardapio/drink-list";
import { agrupadosPorCategoria, pratosDoDia, secoesDoCardapio } from "@/lib/cardapio";
import { MenuJsonLd, RotaBreadcrumbJsonLd } from "@/components/json-ld";
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
  const tTrilha = await getTranslations({ locale, namespace: "nav" });
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
   * O título do painel de cada dia, só para leitor de tela — ver o aviso em
   * `DayTabs`. Montado aqui porque o componente é de cliente e não tem o
   * catálogo, igual aos rótulos acima.
   */
  const titulosDePainel = Object.fromEntries(
    WEEKDAYS.map((d) => [
      d,
      t("dayPanelHeading", { day: t(`weekday${d}` as "weekday1") }),
    ]),
  );

  /*
   * O dia de hoje resolvido no fuso do restaurante, e `null` no fim de semana.
   * `weekdayNoRestaurante` devolve 6 e 7 no sábado e no domingo, que não são
   * dias de cardápio — as abas caem na segunda, porque abrir em branco seria
   * pior que abrir no primeiro dia útil.
   */
  const hojeNaSemana = weekdayNoRestaurante();
  const hoje = isWeekday(hojeNaSemana) ? hojeNaSemana : null;

  /*
   * O cardapio como dado estruturado. As secoes saem do mesmo dado que a tela
   * desenha, e os rotulos do mesmo catalogo — duas fontes contariam historias
   * diferentes para a pessoa e para o buscador.
   *
   * Os rotulos de grupo de bebida vem daqui, e nao do componente, pela mesma
   * razao que os rotulos de dia: `secoesDoCardapio` e pura e nao conhece o
   * catalogo, o que e o que a deixa exercitavel com listas que o banco de hoje
   * nunca produziria.
   */
  const secoesEstruturadas = secoesDoCardapio({
    buffet,
    massas,
    rotulos: {
      massas: t("pastaLabel"),
      sobremesas: t("dessertsLabel"),
      bebidas: t("drinksLabel"),
      vinhos: t("winesLabel"),
    },
    sobremesas: desserts,
    bebidas: drinkGroups.map((g) => ({
      name: t(g.labelKey as "drinksSodasBeer"),
      items: g.items,
    })),
    vinhos: wines,
  });

  return (
    <>
      <RotaBreadcrumbJsonLd locale={locale} rota="/cardapio" nome={tTrilha("cardapio")} />

      {/* A identidade antes da lista: quem chega aqui pode ter escaneado um
          código na mesa e nunca ter visto o site. */}
      {/* O fundo verde da página inteira. Não repita a descrição dele aqui:
          `menu-backdrop.tsx` é a fonte, e um comentário duplicado já envelheceu
          no projeto irmão — descrevia uma versão que não estava mais no ar. */}
      <MenuBackdrop />

      {/* Antes de tudo na arvore porque nao desenha nada: e o cardapio para
          quem le a pagina por maquina. */}
      <MenuJsonLd locale={locale} secoes={secoesEstruturadas} />

      {/* A capa assina, em faixa. Ver o docblock de `MenuHero`. */}
      <MenuHero />

      {/* E a comida ocupa a primeira dobra — "comida vende, couro nao". */}
      <MenuPhoto />

      {/* Coluna estreita: um cardápio é lido de cima a baixo, não varrido em
          grade. `max-w-3xl` mantém a linha na faixa confortável de leitura
          mesmo num monitor largo. */}
      <MenuSection title={t("title")} subtitle={t("subtitle")} level={1}>
        {/* Some inteiro enquanto os preços não vierem do cliente — ver
            `price-callout.tsx`. */}
        <PriceCallout buffet={precoDoBuffet()} massa={precoDaMassa()} />

        {buffet.length === 0 ? (
          <p className="text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="mt-10">
            <DayTabs
              labels={rotulos}
              panelHeadings={titulosDePainel}
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
                        {/* ⚠️ **`h3` desde 14/09, e o comentário anterior aqui
                            defendia `h2` com um argumento que era certo na
                            época:** acima só existia o `h1` da página, então
                            `h3` pularia um nível e empataria a categoria com os
                            pratos.

                            O que mudou é que o DIA passou a ter título. A
                            árvore agora é página → dia → categoria → prato, e a
                            categoria ocupa o terceiro degrau sem pular nada.
                            Antes, as seis categorias do dia ficavam no mesmo
                            nível de "Sobremesas" e "Ilha de massas", que são
                            seções inteiras do cardápio — a estrutura afirmava
                            que uma prateleira do buffet pesa o mesmo que elas.

                            O tamanho do texto não mudou: nível de título é
                            estrutura, tamanho é desenho. */}
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          {grupo.categoria.name}
                        </h3>
                        <ul role="list" className="overflow-hidden rounded-2xl border border-border bg-card">
                          {grupo.pratos.map((prato) => (
                            // Quarto degrau: dia → categoria → prato. Na ilha
                            // de massas, mais abaixo, a linha fica direto sob a
                            // seção e mantém o padrão `h3`.
                            <DishRow key={prato.id} dish={prato} nivel={4} />
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

        {/* ⚠️ **A ressalva do buffet fecha a lista, e isso é pedido do cliente
            em 24/09/2026.** A casa não quis um aviso operacional: quis dizer por
            que o cardápio varia, e a razão é boa — o buffet é montado no dia com
            o que chega.

            Fica DEPOIS da lista de propósito, ao contrário do "Sujeito a
            alterações." que abre a página: aquele avisa antes de alguém se
            apegar a um prato; este explica, para quem já leu tudo, por que a
            quarta que ele viu aqui pode não ser a quarta que ele encontrar.
            São duas frases com dois trabalhos, e é por isso que as duas ficam.

            Discreta por instrução: `text-sm` no tom secundário, sem caixa nem
            ícone. Ela não disputa com os pratos.

            Some junto com a lista: explicar por que o cardápio varia embaixo de
            "o cardápio ainda não foi publicado" responde uma pergunta que
            ninguém fez. */}
        {buffet.length === 0 ? null : (
          <p className="mx-auto mt-10 max-w-2xl text-pretty text-center text-sm leading-relaxed text-muted-foreground">
            {t("buffetVariesNote")}
          </p>
        )}
      </MenuSection>

      {/* Massas: seção própria porque o preço é outro.

          ⚠️ Ela NÃO depende mais de haver massa cadastrada. Dependia, e com o
          banco vazio nunca era desenhada — quem lia o cardápio não descobria
          que a ilha existe, que é justamente o que faria alguém atravessar o
          salão até ela. O passo a passo vem do cardápio da casa, que é código.

          O preço vai no próprio título: quem rolou até aqui não deveria
          precisar voltar ao topo para lembrar quanto custa. Sem preço
          configurado, o título sai só com o rótulo em vez de sair com um vazio
          pendurado num travessão. */}
      <MenuSection
        id="massas"
        title={precoMassa ? `${t("pastaLabel")} — ${precoMassa}` : t("pastaLabel")}
        subtitle={t("pastaNote")}
        align="left"
      >

        {/* Massas cadastradas no painel, quando houver. O passo a passo abaixo
            é o serviço da ilha e independe delas. */}
        {massas.length > 0 ? (
          <ul role="list" className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
            {massas.map((prato) => (
              <DishRow key={prato.id} dish={prato} />
            ))}
          </ul>
        ) : null}

        <PastaBuilder extras={pastaExtras} photos={pastaPhotos} />
      </MenuSection>

      {/* Sobremesas: não pertencem a um dia — saem todo dia, do mesmo balcão.
          Some inteira enquanto a lista estiver vazia: uma vitrine de sobremesas
          sem sobremesa nenhuma promete o que a página não tem. */}
      {desserts.length > 0 ? (
        <MenuSection
          title={t("dessertsLabel")}
          subtitle={t("dessertsNote")}
          align="left"
        >
          <DessertList />

          {/* ⚠️ **Cortesia de aniversário, confirmada pelo cliente em
              24/09/2026.** A regra é exatamente esta e não tem outra condição:
              documento com foto, uma sobremesa. Não escrever "válido de segunda
              a sexta", "uma por mesa" nem qualquer restrição que ninguém
              confirmou — regra promocional inventada é promessa publicada, e
              quem chega cobra na porta.

              Fica DENTRO da seção de sobremesas porque é o que ela oferece; num
              rodapé de página viraria letra miúda. O destaque é `bg-brand/10`,
              superfície e não traço: `accent` como texto dá 1,92:1 e some. */}
          <p className="mt-10 rounded-2xl border border-brand/30 bg-brand/10 px-5 py-4 text-center text-pretty font-medium leading-relaxed">
            {t("birthdayTreat")}
          </p>
        </MenuSection>
      ) : null}

      {/* Bebidas: fecha a página porque é o que se pede por último. Segunda
          seção com preço por linha, pela mesma razão da sobremesa — nenhuma
          das duas entra no valor por quilo. */}
      {drinkGroups.length > 0 ? (
        <MenuSection
          id="bebidas"
          title={t("drinksLabel")}
          subtitle={t("drinksNote")}
          align="left"
        >
          <DrinkList />
        </MenuSection>
      ) : null}

      {/* Carta de vinhos: seção própria porque o vinho não é bebida de balcão.
          Tem rótulo, procedência e uma escolha por trás, e sai em três doses —
          então um rótulo tem vários preços, o que não cabe no formato de uma
          linha por preço das bebidas.

          Ela aparece mesmo sem rótulo cadastrado: nesse caso o componente
          escreve a linha de apoio, que diz que a carta existe e ainda não foi
          digitada. Sumir aqui esconderia do visitante que a casa serve vinho. */}
      <MenuSection
        title={t("winesLabel")}
        subtitle={t("winesNote")}
        align="left"
      >
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
      </MenuSection>
    </>
  );
}
