import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { GalleryPhotoCard } from "@/components/gallery-photo-card";
import { Reveal } from "@/components/ui/reveal";
import { Section } from "@/components/ui/section";
import { getGalleryPhotos } from "@/lib/queries";
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
  const t = await getTranslations({ locale, namespace: "galeria" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    ...localeMetadata(locale, "/galeria"),
  };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("galeria");
  const photos = await getGalleryPhotos(locale);

  return (
    <>
      <RotaBreadcrumbJsonLd locale={locale} rota="/galeria" nome={t("title")} />

      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Section>
        {photos.length === 0 ? (
          <p className="text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          /*
           * ⚠️ DUAS colunas no celular, e a razão é peso, não gosto.
           *
           * A galeria foi de 6 para 22 fotos em 10/09. Com uma coluna cada foto
           * pede a largura inteira da tela — 412 CSS px vezes a densidade do
           * aparelho dá 1070, e o navegador baixa o arquivo de 1200. Em duas
           * colunas ele pede metade disso, e o arquivo cai a cerca de um terço
           * dos bytes. O `sizes` do cartão acompanha, senão a promessa de
           * largura inteira faz o navegador baixar o grande de todo jeito.
           *
           * De quebra a galeria fica percorrível: vinte e duas fotos
           * empilhadas numa coluna são vinte e duas telas de rolagem.
           */
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
            {photos.map((photo, i) =>
              // A primeira foto fica FORA da revelação, pelo mesmo motivo que o
              // título das páginas internas saiu dela: `Reveal` nasce com
              // `opacity: 0` e só aparece depois de hidratar. Ela é o maior
              // elemento da tela — esconder o LCP atrás do JavaScript anula o
              // `priority` que acabou de ser dado a ela.
              i === 0 ? (
                <div key={photo.id} className="h-full">
                  <GalleryPhotoCard photo={photo} priority />
                </div>
              ) : (
                <Reveal key={photo.id} delay={(i % 3) * 90} className="h-full">
                  <GalleryPhotoCard photo={photo} />
                </Reveal>
              ),
            )}
          </div>
        )}
      </Section>
    </>
  );
}
