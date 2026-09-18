import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/sections/hero";
import { MenuPreview } from "@/components/sections/menu-preview";
import { GalleryPreview } from "@/components/sections/gallery-preview";
import { InstagramFeed } from "@/components/sections/instagram-feed";
import { Testimonials } from "@/components/sections/testimonials";
import { CTA } from "@/components/sections/cta";
import { siteConfig } from "@/config/site";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";

// Statically rendered (ISR): the CMS-backed sections read tagged, cached
// queries, and the admin actions call `revalidateTag` on every edit — so the
// page stays static and fast while updating the instant content changes.

/*
 * O `<title>` e a descricao vem do metadado padrao do layout; aqui entra o
 * canonical auto-referente + hreflang da home, e o `og:title` proprio.
 *
 * ⚠️ **`og:title` e `<title>` sao campos diferentes, com publicos diferentes —
 * e e por isso que este e mais curto.** Sem `openGraph.title`, o Next reaproveita
 * o `<title>`: a home ficava com 66 caracteres no cartao de compartilhamento, e
 * o Facebook corta perto de 60. O que aparece cortado nao e o fim da frase por
 * acaso: e o nome do bairro.
 *
 * O corte trocou "no Centro de Santos" por "em Santos" e manteve as tres coisas
 * que a casa serve. A troca e deliberada: o `<title>`, que e o que a busca le,
 * continua com o bairro inteiro e com os 66 caracteres — buscador nao corta em
 * 60, rede social corta. `test/metadados-cabem-no-cartao.test.ts` guarda os dois
 * lados, para ninguem "unificar" as duas strings depois.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    ...localeMetadata(locale, "", { title: t("ogTitle", { brand: siteConfig.name }) }),
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <MenuPreview locale={locale} />
      <GalleryPreview locale={locale} />
      {/* Continuação da galeria, não seção institucional. Não renderiza nada
          enquanto as credenciais não chegarem — ver `lib/instagram.ts`. */}
      <InstagramFeed />
      <Testimonials locale={locale} />
      <CTA />
    </>
  );
}
