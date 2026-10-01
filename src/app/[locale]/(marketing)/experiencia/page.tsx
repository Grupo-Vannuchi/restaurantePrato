import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
import { richTags } from "@/i18n/rich";
import type { Metadata } from "next";
import Image from "next/image";
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
import { fillYears, yearsInBusiness } from "@/config/site";
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
  const salaoItems = t.raw("salaoPreparado.items") as string[];
  /* `fillYears` aqui pelo mesmo motivo dos itens acima: um dos marcos cita o
     tempo de casa, e ele sai de `foundedYear` para não divergir da home. */
  const tradicaoItems = (t.raw("tradicao.items") as string[]).map((item) =>
    fillYears(item),
  );
  const brasaParagraphs = t.raw("brasa.paragraphs") as string[];
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
      {/* ⚠️ **A foto voltou em 01/10/2026, a pedido do dono — e a faixa verde
          que ela substitui tinha sido pedida por ele mesmo em 25/09.** Fica
          registrado nesta ordem para ninguém ler a volta como esquecimento e
          "corrigir" de novo para verde.

          `salao-entrada` e não outra: o dono apontou esta. Ela saiu do
          carrossel de /reservas no mesmo commit — a mesma foto em duas
          páginas gasta duas vezes o que ela tem a dizer.

          ⚠️ O `overflow-hidden` da foto volta junto, e ele já escondeu um
          defeito aqui: até 25/09 ele CORTAVA "Experiência" a 200% de texto e
          a guarda de refluxo passava verde. O `break-words` do `page-header`
          é que resolve de fato, e continua no lugar — ver a nota de lá. */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        image="/ambiente/salao-entrada.webp"
        imageAlt={t("headerAlt")}
      />

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
            {t.rich("leadIntro", { ...richTags, years: yearsInBusiness() })}
          </p>
          {leadParagraphs.map((paragrafo) => (
            <p key={paragrafo} className="text-pretty text-xl leading-relaxed">
              {paragrafo}
            </p>
          ))}
        </div>
      </Section>

      {/* ⚠️ **Dois blocos por linha desde 01/10/2026, a pedido do dono: "iguais
          do fogão de ouro".** Lá os quatro blocos de tópicos vivem em duas
          grades `lg:grid-cols-2`, e aqui cada um ocupava uma seção inteira —
          quatro faixas empilhadas, com o leitor rolando por uma coluna de
          `max-w-xl` num espaço de 1152.

          ⚠️ **O irmão tem QUATRO listas e o Prato tem TRÊS.** Falta aqui o
          equivalente a "O melhor momento para você": a copy que o dono entregou
          em 29/09 não trazia esse bloco, e inventá-lo para fechar a simetria
          seria escrever texto de cliente. Por isso a segunda linha pareia a
          lista restante com o bloco da brasa, que é texto corrido — o que fecha
          as duas linhas sem deixar meia fila vazia, que é como um card órfão
          lê: erro de carregamento.

          O `max-w-xl` de cada bloco fica: ele é a medida de leitura confortável,
          e agora cabem dois lado a lado em vez de um com metade da tela em
          branco. */}
      <Section className="border-y border-border bg-muted/30">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold">{t("audience.title")}</h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              {t.rich("audience.intro", richTags)}
            </p>
            <CheckList items={audienceItems} />
          </div>

          {/* ⚠️ **Três blocos novos em 29/09/2026: a copy do cliente veio inteira
              e a página não tinha onde pôr.** O dono mandou o texto duas vezes;
              na primeira eu o reescrevi em vez de trocar, e ele cobrou. Esta é a
              copy dele, com três mudanças que eu não pude deixar idênticas e que
              estão nomeadas no commit — nenhuma delas é gosto meu: um termo
              bloqueado pela guarda de higiene de marca, o tempo de casa (que o
              site calcula de `foundedYear` e publica na home, então dois números
              diferentes se contradiriam) e os travessões, proibidos no catálogo
              por outra guarda.

              ⚠️ O resto entrou na palavra dele, que é o que vale para dado de
              cliente — inclusive o que eu não consigo verificar aqui:
              climatização, os cortes do churrasco, o cafezinho e a contagem de
              opções. Nenhum deles aparece no cardápio que o banco guarda, o que
              não os torna falsos: o buffet cadastrado não é a lista da
              churrasqueira. */}
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold">{t("salaoPreparado.title")}</h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              {t.rich("salaoPreparado.intro", richTags)}
            </p>
            <CheckList items={salaoItems} />
          </div>
        </div>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold">{t("tradicao.title")}</h2>
            <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
              {t.rich("tradicao.intro", richTags)}
            </p>
            <CheckList items={tradicaoItems} />
            <p className="mt-8 text-pretty leading-relaxed">
              {t.rich("tradicao.closing", richTags)}
            </p>
          </div>

          <div className="flex max-w-xl flex-col gap-5">
            <h2 className="text-balance text-2xl font-bold">{t("brasa.title")}</h2>
            {brasaParagraphs.map((paragrafo) => (
              <p key={paragrafo} className="text-pretty leading-relaxed">
                {paragrafo}
              </p>
            ))}
          </div>
        </div>
      </Section>

      {/* ⚠️ **Faixa da fachada entre as seções, a pedido do dono em
          01/10/2026.** Entre os blocos de tópicos e os horários havia um vão
          de texto puro: a página descia de uma lista para outra sem nada que
          deixasse o olho respirar.

          `fachada-faixa` e não a `fachada` do cabeçalho de `/contato`: aquela
          vem recortada de 0 a 620 da origem para a placa ficar no centro de
          uma faixa de 4,55:1, e numa faixa larga como esta o mesmo arquivo
          cortaria diferente. Esta sai da fotografia ANGULADA, que estava sem
          uso desde que a frontal a substituiu — a diagonal dá profundidade
          numa faixa baixa, e as duas páginas deixam de mostrar o mesmo quadro.

          Decorativa: `alt=""`. Tudo o que ela diz já está na copy acima e no
          endereço do rodapé; descrevê-la faria o leitor de tela anunciar uma
          imagem entre dois blocos de texto que não dependem dela. */}
      <div className="relative h-56 w-full overflow-hidden sm:h-72 lg:h-80">
        <Image
          src="/ambiente/fachada-faixa.webp"
          alt=""
          fill
          sizes="100vw"
          quality={50}
          className="object-cover"
        />
      </div>

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
