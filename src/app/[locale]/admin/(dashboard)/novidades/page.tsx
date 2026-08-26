import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus, Pencil, Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { InformationDeleteButton } from "@/components/admin/information-delete-button";
import { getAdminInformations } from "@/lib/admin-queries";
import { localize } from "@/lib/content";
import { resolveLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export default async function AdminInformationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("admin.novidades");
  const informations = await getAdminInformations();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Link href="/admin/novidades/new" className={buttonVariants({ size: "md" })}>
          <Plus className="size-4" />
          {t("new")}
        </Link>
      </div>

      {informations.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {informations.map((information) => (
            <li
              key={information.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon name={information.icon} className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">
                      {localize(information.title, locale)}
                    </h2>
                    {information.featured ? (
                      /* `role="img"` junto com o rótulo: o lucide só põe
                         `aria-hidden` quando NÃO há prop de acessibilidade, e
                         passar `aria-label` desliga esse escudo sem dar papel
                         nenhum ao SVG. O resultado era um gráfico nomeado e sem
                         papel, que vários leitores de tela ignoram — e aí "esta
                         novidade está em destaque" existia só na cor da
                         estrela. */
                      <Star
                        role="img"
                        className="size-4 fill-accent text-accent"
                        aria-label={t("featured")}
                      />
                    ) : null}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        information.published
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {information.published ? t("statusPublished") : t("statusDraft")}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    /{information.slug}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/admin/novidades/${information.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="size-4" />
                  {t("edit")}
                </Link>
                <InformationDeleteButton
                  id={information.id}
                  title={localize(information.title, locale)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
