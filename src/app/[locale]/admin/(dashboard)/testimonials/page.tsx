import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus, Pencil, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { TestimonialDeleteButton } from "@/components/admin/testimonial-delete-button";
import { getAdminTestimonials } from "@/lib/admin-queries";
import { resolveLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export default async function AdminTestimonialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("admin.testimonials");
  const testimonials = await getAdminTestimonials();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Link href="/admin/testimonials/new" className={buttonVariants({ size: "md" })}>
          <Plus className="size-4" />
          {t("new")}
        </Link>
      </div>

      {testimonials.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {testimonials.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{item.authorName}</h2>
                  <span
                    className="flex gap-0.5"
                    aria-label={t("stars", { count: item.rating })}
                  >
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="size-3.5 fill-brand text-brand" aria-hidden />
                    ))}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      item.published
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.published ? t("statusPublished") : t("statusDraft")}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
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

              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/admin/testimonials/${item.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="size-4" />
                  {t("edit")}
                </Link>
                <TestimonialDeleteButton id={item.id} name={item.authorName} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
