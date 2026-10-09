import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { InformationCard } from "@/components/information-card";
import { InformationGallery } from "@/components/information-gallery";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { getInformations } from "@/lib/queries";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
import { RotaBreadcrumbJsonLd } from "@/components/json-ld";

/*
   * ⚠️ **O `title` da aba NÃO é o `<h1>` da página, e isto foi medido.**
   *
   * As duas coisas saíam da MESMA chave `title`, e o resultado era bom de um
   * lado e desperdício do outro: "Galeria · Restaurante Prato" dá 27
   * caracteres onde o Google mostra ~60, e não carrega nenhum termo de
   * intenção local. Medido em 09/10/2026 nas quatro rotas: 27, 28, 29 e 33.
   *
   * Não era esquecimento, era acoplamento — e por isso não tinha correção
   * sem estrago: encher o `<h1>` de palavra-chave estraga a página para quem
   * lê, e encurtar o `title` para caber na voz da marca joga fora a vitrine
   * do resultado de busca. São dois públicos e dois textos.
   *
   * Então `metaTitle` é só do buscador e `title` segue sendo o que a pessoa
   * lê na página. O sufixo ` · Restaurante Prato` vem do `titleTemplate` do
   * layout, então a chave daqui tem de caber em ~40 caracteres.
   *
   * ⚠️ As frases de `metaTitle` usam só fatos JÁ publicados no site — buffet,
   * brasa, ilha de massas, o horário e o Centro de Santos. Título de busca é
   * promessa: inventar ali é inventar dado do cliente num lugar onde ninguém
   * revisa.
   */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "novidades" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    ...localeMetadata(locale, "/novidades"),
  };
}

export default async function InformationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const tTrilha = await getTranslations({ locale, namespace: "nav" });
  const t = await getTranslations("novidades");
  const informations = await getInformations(locale);

  return (
    <>
      <RotaBreadcrumbJsonLd locale={locale} rota="/novidades" nome={tTrilha("novidades")} />

      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Section>
        {informations.length === 0 ? (
          <p className="text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          <InformationGallery items={informations}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {informations.map((information, i) =>
                // A primeira fica fora da revelação — ver a nota em
                // `galeria/page.tsx`: esconder o LCP atrás da hidratação anula
                // a prioridade dada à imagem.
                i === 0 ? (
                  <div key={information.id} className="h-full">
                    <InformationCard information={information} priority headingLevel={2} />
                  </div>
                ) : (
                  <Reveal key={information.id} delay={(i % 4) * 80} className="h-full">
                    <InformationCard information={information} headingLevel={2} />
                  </Reveal>
                ),
              )}
            </div>
          </InformationGallery>
        )}
      </Section>
    </>
  );
}
