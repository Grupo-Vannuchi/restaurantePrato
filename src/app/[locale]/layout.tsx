import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeStyle } from "@/components/theme-style";
import { siteConfig } from "@/config/site";
import { env } from "@/lib/env";
import { baseOpenGraph } from "@/lib/seo";
import { locales, routing, resolveLocale } from "@/i18n/routing";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
/**
 * Display face for headings — the client's direction asks for "serifada
 * elegante nos títulos + sans limpa no corpo". Self-hosted by `next/font`, so
 * it costs no extra connection and can't shift layout (`display: swap` plus a
 * matched fallback metric are handled by Next).
 */
const playfair = Playfair_Display({
  // Not `--font-serif`: that name is the Tailwind theme token in globals.css,
  // and pointing it at itself would be circular.
  variable: "--font-serif-display",
  subsets: ["latin"],
  display: "swap",
});

/** Pre-render every locale at build time. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = resolveLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: {
      default: t("defaultTitle", { brand: siteConfig.name }),
      template: t("titleTemplate", { brand: siteConfig.name }),
    },
    description: t("description"),
    keywords: t("keywords"),
    applicationName: siteConfig.name,
    // `robots.txt` only *asks* crawlers to stay away; this meta tag is what
    // actually keeps an already-fetched page out of the results. Both are
    // driven by the same switch, which defaults to closed — so the field is
    // added while the site is unpublished and disappears entirely once
    // `SITE_INDEXABLE=true`. Spread, not assigned: the surrounding metadata
    // (title template, description, openGraph) must survive untouched, and an
    // indexable build must emit no robots directive at all.
    ...(env.SITE_INDEXABLE
      ? {}
      : { robots: { index: false, follow: false } as const }),
    // og/twitter title + description are intentionally omitted: Next derives
    // them from each page's `title`/`description`, so every route gets its own
    // social copy instead of the site default. `baseOpenGraph` is the single
    // source for type/siteName/locale + the shared OG image, reused by every
    // page's `localeMetadata` so the shallow metadata merge never drops them.
    openGraph: baseOpenGraph(locale),
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enables static rendering for this locale (next-intl).
  setRequestLocale(locale);

  // Origem do Storage, para o `preconnect` abaixo. `URL` normaliza para só o
  // esquema + host, que é o que `preconnect` espera.
  const origemDasImagens = env.SUPABASE_URL
    ? new URL(env.SUPABASE_URL).origin
    : null;

  // Tudo menos o painel. `admin` é 57% do catálogo e não serve ao visitante.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { admin: _painel, ...mensagensPublicas } = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${playfair.variable} h-full`}
    >
      <head>
        {/* Abre a conexão com o servidor de imagens ANTES de a primeira foto
            ser pedida. Toda imagem cadastrada pelo painel vem do Supabase, que
            é outro domínio: sem isto, a primeira foto paga DNS + TCP + TLS
            dentro do caminho crítico — e a primeira foto de uma página costuma
            ser o maior elemento dela.

            Só sai quando o Storage está configurado; num ambiente sem ele, um
            `preconnect` para lugar nenhum é desperdício de uma conexão. */}
        {origemDasImagens ? (
          <>
            <link rel="preconnect" href={origemDasImagens} />
            <link rel="dns-prefetch" href={origemDasImagens} />
          </>
        ) : null}
        {/* Uma paleta só: não há escolha guardada para aplicar antes da
            primeira pintura, e por isso o `suppressHydrationWarning` do <html>
            saiu junto — ele existia só porque aquele script mexia no elemento
            antes do React. */}
        <ThemeStyle />
      </head>
      <body className="flex min-h-full flex-col">
        {/* `messages` explícito, e o motivo é medido: sem a prop, o next-intl
            serializa o CATÁLOGO INTEIRO no payload de toda página. A namespace
            `admin` sozinha são 12 KB de textos de login, erros do WhatsApp e
            dicas de campo do cardápio — baixados por quem só quer ver o menu, e
            de novo a cada navegação interna.

            O painel recebe o catálogo completo no próprio layout dele. */}
        <NextIntlClientProvider messages={mensagensPublicas}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
