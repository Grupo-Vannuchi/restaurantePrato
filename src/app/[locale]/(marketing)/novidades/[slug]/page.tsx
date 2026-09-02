import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { Icon } from "@/components/ui/icon";
import { RichText } from "@/components/rich-text";
import { VisitBlock } from "@/components/visit-block";
import { InformationCard } from "@/components/information-card";
import { InformationGallery } from "@/components/information-gallery";
import { getInformationBySlug, getInformations } from "@/lib/queries";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata, localizedUrl, absoluteUrl } from "@/lib/seo";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/json-ld";

type Params = { locale: string; slug: string };

// Don't prerender slugs at build — detail pages render on the first request and
// are then cached (ISR via the `informations` tag). Keeps the build small/fast.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  const information = await getInformationBySlug(locale, slug);
  if (!information) return {};
  return {
    title: information.title,
    description: information.description,
    ...localeMetadata(locale, `/novidades/${slug}`, {
      type: "article",
      ...(information.image && {
        images: [{ url: absoluteUrl(information.image), alt: information.title }],
      }),
    }),
  };
}

export default async function InformationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = resolveLocale(rawLocale);
  setRequestLocale(locale);
  const t = await getTranslations("novidades");
  const tn = await getTranslations("nav");

  // The article plus the full list that powers the right-hand sidebar.
  const [information, informations] = await Promise.all([
    getInformationBySlug(locale, slug),
    getInformations(locale),
  ]);

  if (!information) notFound();

  // Related = the nearest siblings in the ordered catalog (entries are grouped by
  // theme cluster, so neighbours are genuinely related), wrapping at the end.
  const currentIndex = informations.findIndex((i) => i.slug === slug);
  const related = Array.from({ length: Math.min(4, informations.length - 1) }, (_, k) =>
    informations[(currentIndex + k + 1) % informations.length],
  ).filter((i) => i.slug !== slug);

  return (
    <article>
      <ArticleJsonLd
        locale={locale}
        slug={slug}
        name={information.title}
        description={information.description}
        image={information.image}
        datePublished={information.createdAt}
        dateModified={information.updatedAt}
      />
      <BreadcrumbJsonLd
        items={[
          { name: siteConfig.name, url: localizedUrl(locale) },
          { name: tn("novidades"), url: localizedUrl(locale, "/novidades") },
          {
            name: information.title,
            url: localizedUrl(locale, `/novidades/${slug}`),
          },
        ]}
      />

      <Container className="py-12 sm:py-16">
        <Link
          href="/novidades"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t("title")}
        </Link>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
          {/* Article */}
          <div className="min-w-0">
            {information.image ? (
              <div className="relative mb-8 aspect-[21/9] overflow-hidden rounded-2xl bg-brand/10">
                <Image
                  src={information.image}
                  alt=""
                  fill
                  priority
                  sizes="(min-width: 1024px) 800px, 100vw"
                  className="object-cover"
                />
              </div>
            ) : null}
            <span className="inline-flex size-14 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Icon name={information.icon} className="size-7" />
            </span>
            <h1 className="mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              {information.title}
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
              {information.description}
            </p>

            {information.content.length > 0 ? (
              <RichText
                blocks={information.content}
                className="mt-10 flex max-w-3xl flex-col gap-5 text-pretty"
              />
            ) : null}
          </div>

          {/* Sticky list of all informations */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav aria-label={t("listTitle")}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("listTitle")}
              </h2>
              <ul className="flex max-h-[26rem] flex-col gap-1 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-2">
                {informations.map((item) => {
                  const active = item.slug === slug;
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/novidades/${item.slug}`}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-brand/10 font-medium text-brand"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon name={item.icon} className="size-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-16">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("relatedTitle")}
            </h2>
            <InformationGallery items={informations}>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((item) => (
                  <InformationCard key={item.id} information={item} />
                ))}
              </div>
            </InformationGallery>
          </section>
        ) : null}

        {/* Fecha o artigo com onde fica e que horas abre. Ficou vazio quando
            a tabela falsa de "regiões que atendemos" saiu, em 27/08. */}
        <VisitBlock />
      </Container>
    </article>
  );
}
