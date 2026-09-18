import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
import { LegalDocument } from "@/components/legal-document";
import { getLegal } from "@/content/legal";

/*
 * ⚠️ **A descrição NÃO é o primeiro parágrafo do documento, e isso foi medido.**
 * Era: `privacy.intro[0]`, o parágrafo jurídico inteiro. Duas consequências que
 * a auditoria de 18/09/2026 pegou no site publicado:
 *
 * · 370 caracteres em /privacy e 350 em /terms, contra o corte de ~160 — o
 *   trecho sai cortado no meio de uma frase de qualificação da empresa;
 * · em /terms a descrição PUBLICAVA o marcador interno
 *   `«PENDENTE: domínio final do site»`. No corpo do documento ele é
 *   deliberado — é o que impede alguém de inventar o domínio, e é por isso que
 *   o site está fechado aos buscadores. Numa meta tag ele é só vazamento.
 *
 * A descrição agora é copy própria, no catálogo: descreve o documento sem
 * repetir o texto legal e sem citar dado que ainda não existe.
 * `test/metadados-cabem-no-cartao.test.ts` cobra o teto e a ausência do
 * marcador.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const { terms } = getLegal(locale);
  const t = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: terms.title,
    description: t("termsDescription"),
    ...localeMetadata(locale, "/terms"),
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const { terms } = getLegal(locale);
  return <LegalDocument doc={terms} />;
}
