import { defineRouting } from "next-intl/routing";
import { hasLocale } from "next-intl";

/**
 * Single source of truth for the locales the site supports.
 * Add a locale here, add a matching message catalog in `src/messages/`, and add
 * the locale key to every `LocalizedText` value — nothing else needs to change.
 *
 * O site do Restaurante Prato é só em português: o restaurante atende o Centro
 * de Santos e não tem público de língua inglesa que justifique o custo de
 * tradução em cada conteúdo gerenciado pelo admin.
 */
export const locales = ["pt"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Default locale is served without a prefix ("/"), others are prefixed ("/en").
  localePrefix: "as-needed",
});

/**
 * Narrows the raw `params.locale` string (typed by Next as `string`) to our
 * `Locale` union, falling back to the default locale. Use at the top of every
 * localized page/layout before calling next-intl APIs.
 */
export function resolveLocale(value: string): Locale {
  return hasLocale(locales, value) ? value : defaultLocale;
}
