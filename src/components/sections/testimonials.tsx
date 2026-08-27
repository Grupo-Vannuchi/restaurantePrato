import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { getTestimonials } from "@/lib/queries";
import type { Locale } from "@/i18n/routing";

export async function Testimonials({ locale }: { locale: Locale }) {
  const t = await getTranslations("home.testimonials");
  const testimonials = await getTestimonials(locale);

  if (testimonials.length === 0) return null;

  return (
    <Section className="bg-muted/30">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        className="mx-auto"
      />
      <ul className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((item, i) => (
          <Reveal
            as="li"
            key={item.id}
            delay={(i % 3) * 90}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex gap-0.5" aria-label={`${item.rating}/5`}>
              {Array.from({ length: item.rating }).map((_, i) => (
                <Star
                  key={i}
                  className="size-4 fill-brand text-brand"
                  aria-hidden
                />
              ))}
            </div>
            <blockquote className="flex-1 text-pretty text-sm leading-relaxed">
              “{item.quote}”
            </blockquote>
            <figcaption className="flex items-center gap-3 border-t border-border pt-4">
              {item.avatarUrl ? (
                <Image
                  src={item.avatarUrl}
                  alt={item.authorName}
                  width={44}
                  height={44}
                  className="size-11 rounded-full object-cover"
                />
              ) : null}
              <div>
                <p className="text-sm font-semibold">{item.authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.sourceUrl ? (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      {item.source}
                    </a>
                  ) : (
                    item.source
                  )}
                </p>
              </div>
            </figcaption>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
