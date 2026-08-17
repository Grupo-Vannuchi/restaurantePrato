/**
 * ─────────────────────────────────────────────────────────────────────────
 *  FOGÃO DE OURO RESTAURANTE — BRAND CONFIGURATION
 * ─────────────────────────────────────────────────────────────────────────
 * This is the single source of truth for branding. To re-skin the entire site
 * for another brand, edit the values below — name, contact details, social
 * links, theme colours and navigation. Nothing else needs to change.
 *
 * All user-facing *copy* lives in `src/messages/pt.json` (the site is
 * Portuguese-only); this file holds only brand identity, contact data and
 * theme tokens.
 */

export type ThemePalette = {
  /** Primary brand colour (buttons, links, highlights). */
  brand: string;
  /** Readable text colour on top of `brand`. */
  brandForeground: string;
  /** Secondary accent used sparingly for emphasis. */
  accent: string;
  /** Page background and its readable foreground. */
  background: string;
  foreground: string;
};

/** Keys available under the `nav` translation namespace. */
export type NavKey =
  | "inicio"
  | "experiencia"
  | "gastronomia"
  | "reservas"
  | "contato";

export type NavItem = {
  /** Translation key under the `nav` namespace. */
  key: NavKey;
  /** Route relative to the locale root, e.g. "/gastronomia". */
  href: string;
};

/**
 * Service hours. `days` uses schema.org `DayOfWeek` names because the value is
 * emitted verbatim into `openingHoursSpecification` — the signal that makes
 * Google show "Aberto · fecha às 15h" next to the listing.
 */
export type OpeningHours = {
  days: (
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday"
  )[];
  /** 24h "HH:MM". */
  opens: string;
  closes: string;
};

export type SiteConfig = {
  /** Public brand name shown in the wordmark and titles. */
  name: string;
  /**
   * Registered legal entity name (footer / structured data). Optional: while it
   * is unknown the footer falls back to `name` and the JSON-LD omits the field,
   * which is preferable to publishing a guess.
   */
  legalName?: string;
  /** Year the restaurant was founded — drives the "years in business" copy. */
  foundedYear: number;
  /** Company registration number (Brazil: CNPJ). Optional. */
  registration?: string;

  contact: {
    email: string;
    /**
     * Telefone em forma legível. Opcional: o restaurante pode não ter linha
     * fixa, e nesse caso cada CTA de ligar some em vez de gerar um `tel:` vazio.
     */
    phone?: string;
    whatsapp: {
      /** Digits only, with country code, for wa.me links. */
      number: string;
      /** Human-readable display form. */
      display: string;
      /** Pre-filled message for the WhatsApp CTA (wa.me `?text=`). */
      defaultMessage?: string;
    };
    address: {
      street: string;
      city: string;
      region: string;
      country: string;
      /** Brazilian CEP. Required by schema.org `PostalAddress` to resolve the
       *  restaurant to a physical place in local search results. */
      postalCode?: string;
    };
  };

  social: {
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    facebook?: string;
  };

  /**
   * Default content author (a real person) for Article schema — the E-E-A-T
   * "byline" signal. `url` should be their profile (LinkedIn, etc.).
   */
  author?: { name: string; url?: string };

  /** Primary navigation shown in the header and footer. */
  nav: NavItem[];

  /** When the restaurant serves. Drives both the copy and the local SEO schema. */
  openingHours: OpeningHours;

  /**
   * Cuisine types for schema.org `Restaurant.servesCuisine`.
   * Note: no `priceRange` — the client's visual direction forbids publishing
   * prices, and emitting one in structured data would surface it in search.
   */
  servesCuisine: string[];

  theme: {
    light: ThemePalette;
    dark: ThemePalette;
  };
};

export const siteConfig: SiteConfig = {
  name: "Fogão de Ouro",
  legalName: "FOGÃO DE OURO RESTAURANTE E PIZZARIA LTDA",
  foundedYear: 2001,
  registration: "04.160.109/0001-47",

  contact: {
    // Caixa real do restaurante. O endereço no domínio próprio
    // (@fogaodeouro.com.br) não existe: o domínio ainda não foi comprado.
    email: "fgdeouro3@gmail.com",
    phone: "+55 (13) 3219-1552",
    whatsapp: {
      // `number` alimenta o link wa.me e por isso é só dígitos, com DDI e sem
      // pontuação — qualquer "+", parêntese ou hífen quebra o deep link.
      // `display` é o que a página de contato mostra para o visitante.
      number: "5513991632985",
      display: "+55 (13) 99163-2985",
      defaultMessage:
        "Olá! Gostaria de reservar uma mesa no Fogão de Ouro. Podem me ajudar?",
    },
    address: {
      street: "Rua Frei Gaspar, 46 — Centro Histórico",
      city: "Santos",
      region: "SP",
      country: "Brasil",
      postalCode: "11010-090",
    },
  },

  social: {
    instagram: "https://instagram.com/fogao.de.ouro",
  },

  nav: [
    { key: "inicio", href: "/" },
    { key: "experiencia", href: "/experiencia" },
    { key: "gastronomia", href: "/gastronomia" },
    { key: "reservas", href: "/reservas" },
    { key: "contato", href: "/contato" },
  ],

  openingHours: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "11:00",
    closes: "15:00",
  },

  servesCuisine: ["Brasileira", "Churrasco", "Frutos do mar", "Buffet"],

  /**
   * Dark-first, per the client's visual direction: a graphite ground makes the
   * food photography the protagonist. The four brand colours are amber
   * (#E68A08 — "Ouro"), ember (#E04F26), warm graphite (#474544) and cream
   * (#EFE9C2).
   *
   * The light theme darkens the amber to #8A5206: the pure brand amber over
   * cream is 2.14:1, which is unreadable. Same hue, darker tone — the practice
   * of shipping a per-theme brand hex is what the previous brand did too.
   * Contrast ratios are reproducible via
   * `node docs/superpowers/specs/2026-08-07-palette-contrast.mjs`.
   */
  theme: {
    light: {
      brand: "#8A5206", // 5.20:1 sobre o creme
      brandForeground: "#ffffff", // 6.38:1 sobre o brand
      accent: "#E04F26", // 3.22:1 — gráfico/UI, nunca texto
      background: "#EFE9C2",
      foreground: "#474544", // 7.77:1
    },
    dark: {
      brand: "#E68A08", // 6.89:1 sobre o grafite
      brandForeground: "#171615", // 6.89:1 sobre o brand
      accent: "#E04F26", // 4.57:1
      background: "#171615",
      foreground: "#EFE9C2", // 14.72:1
    },
  },
};

/** Number of full years the restaurant has been operating. */
export function yearsInBusiness(now: Date = new Date()): number {
  return now.getFullYear() - siteConfig.foundedYear;
}

/**
 * Fills the `{years}` token in copy read through `t.raw()`.
 *
 * Ordered copy (hero slides, bullet lists) is read as a raw array, and next-intl
 * types values per message: a template-literal key over an array whose other
 * items carry no placeholder resolves to "no values accepted", so `t(key, {…})`
 * stops typechecking. Substituting the token directly keeps any item free to
 * mention the age without its position becoming load-bearing — reordering the
 * copy can't silently leave a raw `{years}` on the page.
 *
 * The age is a small integer, so no ICU number formatting is lost.
 */
export function fillYears(text: string, now: Date = new Date()): string {
  return text.replaceAll("{years}", String(yearsInBusiness(now)));
}

/** Whether a WhatsApp number has been configured for the restaurant. */
export function hasWhatsapp(): boolean {
  return siteConfig.contact.whatsapp.number.trim().length > 0;
}

/**
 * Build a wa.me deep link, or `null` when no number is configured yet. Callers
 * must handle the null case — falling back to the phone number — so an
 * unconfigured WhatsApp degrades to "ligar" instead of a dead link.
 */
export function whatsappLink(message?: string): string | null {
  if (!hasWhatsapp()) return null;
  const base = `https://wa.me/${siteConfig.contact.whatsapp.number}`;
  const text = message ?? siteConfig.contact.whatsapp.defaultMessage;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/**
 * Um href `tel:` a partir do telefone legível, ou `null` quando não há telefone
 * configurado. Os chamadores precisam tratar o null — mesmo contrato de
 * `whatsappLink()`.
 */
export function phoneLink(): string | null {
  const { phone } = siteConfig.contact;
  if (!phone) return null;
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** The restaurant's address as a single comma-separated line. */
export function fullAddress(): string {
  const { street, city, region, country } = siteConfig.contact.address;
  return [street, city, region, country].filter(Boolean).join(", ");
}

/**
 * Build a Google Maps embed URL pointing at the restaurant's address. Uses the
 * keyless `output=embed` endpoint, which renders a fully interactive map (zoom,
 * pan, "Open in Maps") without an API key.
 *
 * @param zoom Initial zoom level (1 = world, 20 = building).
 */
export function mapEmbedUrl(zoom = 17): string {
  const params = new URLSearchParams({
    q: fullAddress(),
    z: String(zoom),
    output: "embed",
  });
  return `https://maps.google.com/maps?${params.toString()}`;
}
