/**
 * ─────────────────────────────────────────────────────────────────────────
 *  RESTAURANTE PRATO — BRAND CONFIGURATION
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
 * Google show "Aberto · fecha às 18h" next to the listing.
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
  /**
   * Fuso horário do restaurante, no formato IANA.
   *
   * ⚠️ Toda data mostrada a uma pessoa é formatada neste fuso — nunca no do
   * servidor, que na Vercel é UTC. Use `restaurantDateFormat()` de
   * `@/lib/dates`; não instancie `Intl.DateTimeFormat` por conta própria.
   */
  timeZone: string;

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

  /**
   * Quando o restaurante serve. Alimenta a copy e o SEO local. Opcional: sem o
   * horário real, o site omite — exibir horário errado manda o visitante para a
   * porta fechada e leva o erro para dentro do resultado de busca.
   */
  openingHours?: OpeningHours;

  /**
   * Tipos de cozinha para `Restaurant.servesCuisine`. Opcional enquanto o
   * cardápio do cliente não chega.
   *
   * Nota: não existe `priceRange` porque a direção visual do cliente **anterior**
   * proibia publicar preço. Ver a pergunta aberta §4.1 do spec do rebrand: se o
   * Prato quiser exibir preço, isso volta à mesa.
   */
  servesCuisine?: string[];

  theme: {
    light: ThemePalette;
    dark: ThemePalette;
  };
};

export const siteConfig: SiteConfig = {
  name: "Restaurante Prato",
  legalName: "PRATO COFFEE SHOP REFEICOES LTDA",
  foundedYear: 1998,
  registration: "03.354.096/0001-84",
  // Santos/SP. Um fork para restaurante de outro fuso troca só esta linha.
  timeZone: "America/Sao_Paulo",

  contact: {
    email: "pratocoffee@gmail.com",
    // Sem telefone fixo: o número do cliente é exclusivamente WhatsApp, então
    // `phone` fica de fora e cada CTA de ligar some (ver `phoneLink`).
    whatsapp: {
      // `number` alimenta o link wa.me e por isso é só dígitos, com DDI e sem
      // pontuação — qualquer "+", parênteses ou hífen quebra o deep link.
      number: "5513978208568",
      display: "+55 (13) 97820-8568",
      defaultMessage:
        "Olá! Gostaria de reservar uma mesa no Restaurante Prato. Podem me ajudar?",
    },
    address: {
      street: "R. Augusto Severo, 25 — Centro",
      city: "Santos",
      region: "SP",
      country: "Brasil",
      postalCode: "11010-050",
    },
  },

  // Instagram confirmado em 19/08/2026; alimenta `sameAs` no structured data e
  // a lista de redes do rodapé, que itera este objeto genericamente.
  // ⚠️ PENDENTE: Facebook. Enquanto ausente, sai do grafo sozinho.
  social: {
    instagram: "https://instagram.com/restaurante.prato",
  },

  nav: [
    { key: "inicio", href: "/" },
    { key: "experiencia", href: "/experiencia" },
    { key: "gastronomia", href: "/gastronomia" },
    { key: "reservas", href: "/reservas" },
    { key: "contato", href: "/contato" },
  ],

  // Confirmado pelo cliente em 19/08/2026. Alimenta `openingHoursSpecification`
  // no `Restaurant` JSON-LD, a grade de horários de `/reservas`, a linha do
  // `/llms.txt` e a imagem OG — todos via `openingHoursLabel()`.
  openingHours: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "11:00",
    closes: "15:00",
  },

  // Derivado do documento de copy do cliente (19/08/2026): churrasco na brasa,
  // buffet e comida caseira. "Buffet" fica de fora de propósito — é modelo de
  // serviço, não cozinha, e este campo alimenta `Restaurant.servesCuisine`.
  servesCuisine: ["Brasileira", "Churrasco"],

  /**
   * ⚠️ PALETA HERDADA DO CLIENTE ANTERIOR — trocar no PR 2, quando as cores do
   * Restaurante Prato chegarem. Os hex abaixo são do cliente anterior e estão
   * aqui só para o site continuar renderizando; não são a marca deste cliente.
   *
   * Contrastes verificáveis com
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

/** Ordem canônica da semana, para detectar um intervalo contíguo de dias. */
const DAY_ORDER: OpeningHours["days"] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Rótulo curto em português de cada dia da semana. */
const DAY_LABELS: Record<OpeningHours["days"][number], string> = {
  Monday: "seg",
  Tuesday: "ter",
  Wednesday: "qua",
  Thursday: "qui",
  Friday: "sex",
  Saturday: "sáb",
  Sunday: "dom",
};

/** "11:00" → "11h"; "11:30" → "11h30". */
function hourLabel(value: string): string {
  const [h, m] = value.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/**
 * Uma linha legível de horário — "Seg a sex, das 11h às 15h" — ou `null`
 * enquanto o horário do restaurante não é conhecido.
 *
 * ⚠️ O intervalo de dias faz parte do contrato, não é enfeite. Antes desta
 * função, `llms.txt` e a imagem OG montavam a linha só com `opens`/`closes` e
 * produziam "Aberto das 11h às 15h" — que afirma, para quem lê, que a casa abre
 * todo dia. O Prato fecha no fim de semana; a string sem dias mandaria o
 * visitante para a porta fechada no sábado. Qualquer consumidor novo de horário
 * deve chamar isto em vez de formatar por conta.
 */
export function openingHoursLabel(
  hours: OpeningHours | undefined = siteConfig.openingHours,
): string | null {
  if (!hours) return null;

  const ordered = DAY_ORDER.filter((day) => hours.days.includes(day));
  if (ordered.length === 0) return null;

  const first = DAY_LABELS[ordered[0]];
  const last = DAY_LABELS[ordered[ordered.length - 1]];
  const contiguous =
    DAY_ORDER.indexOf(ordered[ordered.length - 1]) -
      DAY_ORDER.indexOf(ordered[0]) ===
    ordered.length - 1;

  const range =
    ordered.length === 1
      ? first
      : contiguous
        ? `${first} a ${last}`
        : ordered.map((day) => DAY_LABELS[day]).join(", ");

  const label = `${range}, das ${hourLabel(hours.opens)} às ${hourLabel(hours.closes)}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
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
