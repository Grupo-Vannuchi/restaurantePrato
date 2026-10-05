import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MenuBackdrop } from "@/components/cardapio/menu-backdrop";
import { MenuSection } from "@/components/cardapio/menu-section";
import { DayTabs } from "@/components/cardapio/day-tabs";
import { DishRow } from "@/components/cardapio/dish-row";
import { PriceCallout } from "@/components/cardapio/price-callout";
import { DessertList } from "@/components/cardapio/dessert-list";
import { PastaBuilder } from "@/components/cardapio/pasta-builder";
import { WineList } from "@/components/cardapio/wine-list";
import { DrinkGroupList } from "@/components/cardapio/drink-list";
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
import { openingHoursLabel } from "@/config/site";
import { weekdayNoRestaurante } from "@/lib/dates";
import { getBuffetDishes, getPastaDishes } from "@/lib/queries";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";

/*
 * ⚠️ **A rota revalida de hora em hora por causa do DIA, não do cardápio.**
 *
 * Em 02/10/2026 o site passou uma sexta-feira inteira abrindo na QUINTA: esta
 * página é gerada estaticamente, `weekdayNoRestaurante()` roda no build, e o
 * último build tinha sido na véspera. Sem erro, sem aviso — a lista errada
 * selecionada e o selo "Hoje" na aba errada.
 *
 * O conserto de verdade está em `day-tabs.tsx`, que recalcula o dia no
 * NAVEGADOR depois de montar. Este `revalidate` é o segundo cinto, para quem
 * navega sem JavaScript: limita a quanto o dia do build pode envelhecer.
 *
 * Uma hora, e não um dia: o cardápio em si muda pouco, mas o DIA vira à
 * meia-noite, e um visitante do almoço não pode herdar a aba de ontem.
 *
 * ⚠️ Não troque isto por `force-dynamic`. As 31 páginas pré-renderizadas são
 * o que sustenta a decisão da CSP — ver ADR-0004.
 */
export const revalidate = 3600;
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

      {/* O fundo verde da página inteira. Não repita a descrição dele aqui:
          `menu-backdrop.tsx` é a fonte, e um comentário duplicado já envelheceu
          no projeto irmão — descrevia uma versão que não estava mais no ar. */}
      <MenuBackdrop />

      {/* Antes de tudo na arvore porque nao desenha nada: e o cardapio para
          quem le a pagina por maquina. */}
      <MenuJsonLd locale={locale} secoes={secoesEstruturadas} />

      {/* ⚠️ **A página abre direto na lista desde 28/09/2026.** Havia aqui duas
          peças: `MenuHero`, a faixa verde com a logo, e `MenuPhoto`, a dobra da
          foto do churrasco com o horário. As duas saíram a pedido do dono, que
          pediu a estrutura do projeto irmão — lá o cardápio abre no letreiro do
          buffet, sem abertura nenhuma.

          O horário não se perdeu: mudou para o `note` desta seção, que é onde o
          irmão o põe. A ressalva "sujeito a alterações" continua ao lado dos
          preços, em `PriceCallout`, e a explicação de por que o buffet varia
          fecha a lista mais abaixo.

          ⚠️ O que se perdeu foi a MARCA nesta página, e vale saber: quem escaneia
          o código na mesa chega aqui sem nunca ter visto o site, e agora o
          primeiro contato com o nome é o cabeçalho do site, não mais a faixa.

          Coluna estreita: um cardápio é lido de cima a baixo, não varrido em
          grade. `max-w-3xl` mantém a linha na faixa confortável de leitura
          mesmo num monitor largo. */}
      <MenuSection
        title={t("title")}
        subtitle={t("subtitle")}
        note={openingHoursLabel() ?? undefined}
        level={1}
      >
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
        >
          <DessertList />

          {/* ⚠️ **A ressalva desceu do SUBTÍTULO para cá em 02/10/2026.**
              Ela ocupava o espaço logo abaixo do letreiro, em `text-xl
              sm:text-2xl` dentro da chapa — a primeira coisa que se lia sob
              "Sobremesas", em corpo quase de manchete, era um aviso de
              cobrança. E a frase era IDÊNTICA à das bebidas, o que lê como
              carimbo jurídico em vez de alguém falando.

              A informação fica: num restaurante por quilo a dúvida é real, e
              o atrito que ela evita acontece na balança. Mas é confirmação,
              não revelação — cada linha da lista já mostra o próprio preço.

              ⚠️ `text-muted-foreground`, e não um token de apoio solto: esta
              frase cai direto sobre o fundo do cardápio, fora de qualquer
              `bg-card`, e é esse o tom que `menu-backdrop.tsx` mediu ali —
              4,74:1, contra 3,41:1 do verde da marca. Medido de novo depois
              da mudança, não herdado do token. */}
          <p className="mt-6 text-sm text-muted-foreground">
            {t("dessertsPriceNote")}
          </p>

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

          {/* ⚠️ **A taxa de embalagem, confirmada pelo dono em 05/10/2026:
              R$ 2,00.** Até aqui o projeto NÃO tinha essa linha, e o motivo
              estava escrito: o irmão publica a dele, e copiar preço do outro
              restaurante é o erro que este repositório existe para evitar.

              ⚠️ **Ela CONTRADIZ a observação da porção inteira, e isso está
              reportado ao dono.** A linha diz "220 g · para viagem R$ 8,50"
              sobre um item de R$ 8,00 — meio real, não dois. A meia porção
              fecha certo: R$ 11,00 mais R$ 2,00 dá os R$ 13,00 publicados.
              Enquanto ele não disser qual das duas está velha, as duas ficam:
              são dado DELE, e escolher uma por dedução seria inventar preço.

              Mesmo desenho do cartão de aniversário: `bg-brand/10` é
              superfície, não traço — `accent` como texto dá 1,92:1. */}
          <p className="mt-4 rounded-2xl border border-brand/30 bg-brand/10 px-5 py-4 text-center text-pretty font-medium leading-relaxed">
            {t("dessertsTakeaway")}
          </p>
        </MenuSection>
      ) : null}

      {/* Bebidas: fecha a página porque é o que se pede por último. Preço por
          linha, pela mesma razão da sobremesa — nenhuma das duas entra no valor
          por quilo.

          ⚠️ **Uma seção POR GRUPO desde 28/09/2026**, e não uma seção com os
          grupos como subtítulo dentro. É a estrutura do projeto irmão, pedida
          pelo dono — e resolve de verdade o que o cliente apontou em 24/09: ele
          não achava "Sucos", "Café e água" e "Refrigerantes e cervejas" ao
          percorrer a página. Na época a resposta foi aumentar o corpo do `h3`;
          promover a seção é a correção que ele estava pedindo.

          A âncora `bebidas` fica no primeiro grupo: nada no site aponta para
          ela, mas link externo indexado não aparece numa busca do repositório, e
          manter o `id` custa zero.

          ⚠️ A ressalva de preço saiu do subtítulo em 02/10 e virou corpo
          miúdo abaixo da lista — ver a nota junto dela. O comentário antigo
          dizia que ela "vale para os três" e ficava "no primeiro": eram três
          grupos no irmão, e aqui sempre houve um só. */}
      {drinkGroups.map((grupo, i) => (
        <MenuSection
          key={grupo.labelKey}
          id={i === 0 ? "bebidas" : undefined}
          title={t(grupo.labelKey as "drinksSodasBeer")}
          subtitle={t("drinksNote")}
        >
          <DrinkGroupList group={grupo} />

          {/* ⚠️ **Sem `i === 0` aqui, e isso é correção de um condicional que
              nunca distinguiu nada.** O Prato tem UM grupo de bebidas; o
              `i === 0` do subtítulo vinha do projeto irmão, que tem vários.
              Condicional que sempre dá o mesmo resultado esconde a intenção e
              engana quem lê. O `id` abaixo mantém o seu porque ele existe para
              a âncora cair no primeiro, e isso continua valendo se um segundo
              grupo aparecer. */}
          <p className="mt-6 text-sm text-muted-foreground">
            {t("drinksPriceNote")}
          </p>
        </MenuSection>
      ))}

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
