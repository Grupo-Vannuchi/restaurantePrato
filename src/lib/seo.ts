import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { env } from "@/lib/env";

type OpenGraph = NonNullable<Metadata["openGraph"]>;

const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

/**
 * Absolute URL for a path in a given locale. The default locale is served
 * without a prefix ("/"), other locales are prefixed ("/en") — matching the
 * `localePrefix: "as-needed"` routing config.
 */
export function localizedUrl(locale: string, path = ""): string {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  return `${base}${prefix}${path}`;
}

/** hreflang language → URL map for a path across every supported locale. */
export function languageAlternates(path = ""): Record<string, string> {
  return Object.fromEntries(locales.map((l) => [l, localizedUrl(l, path)]));
}

/**
 * Resolve a stored asset reference (which may be a relative path like
 * `/uploads/x.jpg` or an already-absolute `https://…` URL) to an absolute URL.
 * JSON-LD and social images must be absolute, unlike `next/image` `src` values.
 */
export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/**
 * `alternates` block for a page's `generateMetadata`: a self-referencing
 * canonical for the current locale plus hreflang links for every locale.
 * Pass the page's path without the locale prefix, e.g. `"/experiencia"` (home = "").
 */
export function localeAlternates(locale: Locale, path = "") {
  return {
    canonical: localizedUrl(locale, path),
    languages: languageAlternates(path),
  };
}

/**
 * The shared Open Graph block (type/siteName/locale + the default social image).
 * Single source of truth: the root layout and every page spread this so Next's
 * shallow metadata merge — which makes a page's `openGraph` REPLACE the layout's
 * rather than deep-merge it — never drops the image/type/siteName/locale.
 * `overrides` carries the per-page bits (e.g. `url`, `type: "article"`, a
 * page-specific `images`).
 *
 * ⚠️ **A imagem é declarada aqui à mão, e não pela convenção de arquivo — o
 * motivo é o mesmo merge rasteiro descrito acima.** `app/opengraph-image.jpg`
 * anexa a imagem ao `openGraph` do segmento RAIZ; o `openGraph` que este
 * projeto devolve em `[locale]/layout.tsx` substitui o do pai inteiro, e a
 * imagem vai embora com ele. O `<link rel="icon">` sobrevive à mesma troca
 * porque vive noutro campo (`icons`), o que faz o sintoma parecer aleatório:
 * o favicon aparece, o cartão de compartilhamento não.
 *
 * ⚠️ **E o caminho NÃO leva o locale.** O arquivo mora em `src/app/`, fora de
 * `[locale]/`, porque lá dentro ele é inalcançável: a rota de um arquivo
 * estático tem ponto (`/opengraph-image.jpg`), e o matcher de `src/proxy.ts`
 * isenta caminhos com ponto de propósito — sem a reescrita do next-intl, a URL
 * sem prefixo não casa com uma rota que só existe sob `[locale]`.
 *
 * Isso inverteu em 09/09/2026, quando os três geradores `ImageResponse` viraram
 * arquivo estático. O gerador respondia em `/opengraph-image`, SEM ponto: o
 * proxy o reescrevia para `/pt/opengraph-image` e por isso ficar dentro de
 * `[locale]/` era justamente o que o fazia funcionar. Trocar a extensão mudou a
 * rota de classe e o cartão ficou sem imagem por dois dias, sem nada acusar —
 * o build passa, a página responde 200 e o `og:image` sai apontando para um
 * 404. `e2e/metadata-routes.spec.ts` agora busca a URL que o HTML publica.
 */
export function baseOpenGraph(
  locale: Locale,
  overrides: Partial<OpenGraph> = {},
): OpenGraph {
  return {
    type: "website",
    siteName: siteConfig.name,
    locale,
    images: [
      {
        url: absoluteUrl("/opengraph-image.jpg"),
        width: 1200,
        height: 630,
        // Descreve a imagem, não repete o nome da marca: quem recebe o link
        // numa conversa e usa leitor de tela ouve esta frase no lugar do
        // cartão. Era `siteConfig.name`, que só dizia de novo o que o título
        // ao lado já diz.
        alt: "A marca do Restaurante Prato sobre a foto do buffet quente da casa",
      },
    ],
    ...overrides,
  } as OpenGraph;
}

/**
 * The `alternates` + `openGraph` block for a page's `generateMetadata`: a
 * self-referencing canonical for the locale, plus a complete Open Graph object
 * (via `baseOpenGraph`) with the page's own `url`. Spread into the returned
 * metadata: `...localeMetadata(locale, "/experiencia")`. Pass `ogOverrides` for
 * per-page Open Graph (e.g. `{ type: "article" }`).
 */
export function localeMetadata(
  locale: Locale,
  path = "",
  ogOverrides: Partial<OpenGraph> = {},
) {
  return {
    alternates: localeAlternates(locale, path),
    openGraph: baseOpenGraph(locale, {
      url: localizedUrl(locale, path),
      ...ogOverrides,
    }),
  };
}
