import { defaultLocale, locales, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { absoluteUrl, localizedUrl } from "@/lib/seo";

/**
 * Structured data (JSON-LD only — never Microdata/RDFa). Each component emits a
 * single `<script type="application/ld+json">`. Entities cross-reference each
 * other by stable `@id` so search/AI engines resolve one connected graph:
 *
 *   ORG_ID  — the restaurant as a {@link https://schema.org/Restaurant}
 *   SITE_ID — the website as a {@link https://schema.org/WebSite}
 *
 * The website and information articles point back to ORG_ID as their
 * publisher via {@link WebSiteJsonLd} and {@link ArticleJsonLd}.
 */
const ORG_ID = `${localizedUrl(defaultLocale)}/#organization`;
const SITE_ID = `${localizedUrl(defaultLocale)}/#website`;

/** Serialize a JSON-LD object into a `<script>` tag safe for `<head>`/`<body>`. */
function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Schema.org payload is built from trusted static config, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * `Restaurant` structured data — the entity for the whole brand. This is what
 * lets Google show the opening hours, the address and the reservation signal
 * directly in the results, which a generic `Organization` cannot do.
 *
 * Deliberately omits `priceRange`: the client's visual direction forbids
 * publishing prices, and structured data surfaces in search too.
 */
export function OrganizationJsonLd() {
  const {
    name,
    legalName,
    foundedYear,
    contact,
    social,
    openingHours,
    servesCuisine,
  } = siteConfig;
  const url = localizedUrl(defaultLocale);

  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": ORG_ID,
    name,
    // Only emitted once the razão social is known — a guess would be worse.
    ...(legalName && { legalName }),
    url,
    email: contact.email,
    ...(contact.phone && { telephone: contact.phone }),
    foundingDate: String(foundedYear),
    ...(servesCuisine?.length ? { servesCuisine } : {}),
    acceptsReservations: true,
    menu: `${url}/gastronomia`,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address.street,
      addressLocality: contact.address.city,
      addressRegion: contact.address.region,
      addressCountry: contact.address.country,
      ...(contact.address.postalCode && {
        postalCode: contact.address.postalCode,
      }),
    },
    ...(openingHours && {
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: openingHours.days,
          opens: openingHours.opens,
          closes: openingHours.closes,
        },
      ],
    }),
    // Filter out unset social links so `sameAs` never contains undefined.
    sameAs: Object.values(social).filter(Boolean),
  };

  return <JsonLd data={data} />;
}

/**
 * WebSite entity for the whole site. Declares the site's languages and ties it
 * to the publishing Organization. No `SearchAction` — the site has no on-site
 * search endpoint, so advertising one would be misleading.
 */
export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_ID,
    url: localizedUrl(defaultLocale),
    name: siteConfig.name,
    inLanguage: [...locales],
    publisher: { "@id": ORG_ID },
  };

  return <JsonLd data={data} />;
}

/**
 * Breadcrumb trail for a detail page. `items` are ordered root → current page;
 * pass absolute URLs (use {@link localizedUrl}). Enables breadcrumb rich results.
 */
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return <JsonLd data={data} />;
}

/** `Article` schema for an information detail page, published by the restaurant. */
export function ArticleJsonLd({
  locale,
  slug,
  name,
  description,
  image,
  datePublished,
  dateModified,
}: {
  locale: Locale;
  slug: string;
  name: string;
  description: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: name,
    description,
    url: localizedUrl(locale, `/novidades/${slug}`),
    inLanguage: locale,
    ...(image && { image: absoluteUrl(image) }),
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    // A named Person author (with their profile) is a stronger E-E-A-T signal
    // than attributing the article to the org; fall back to the org if unset.
    author: siteConfig.author
      ? {
          "@type": "Person",
          name: siteConfig.author.name,
          ...(siteConfig.author.url && { url: siteConfig.author.url }),
        }
      : { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
  };

  return <JsonLd data={data} />;
}
