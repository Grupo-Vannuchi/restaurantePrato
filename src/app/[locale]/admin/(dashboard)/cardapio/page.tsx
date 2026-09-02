import { getTranslations, setRequestLocale } from "next-intl/server";
import { Plus, Pencil } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { MenuCategoryDeleteButton } from "@/components/admin/menu-category-delete-button";
import { MenuItemDeleteButton } from "@/components/admin/menu-item-delete-button";
import { getAdminMenu } from "@/lib/admin-queries";
import { localize } from "@/lib/content";
import { resolveLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** 1 = segunda … 5 = sexta — indexado por `weekday - 1` para o rótulo traduzido. */
const weekdayKeys = ["weekday1", "weekday2", "weekday3", "weekday4", "weekday5"] as const;

export default async function AdminCardapioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("admin.cardapio");
  const categories = await getAdminMenu();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Link
          href="/admin/cardapio/categorias/new"
          className={buttonVariants({ size: "md" })}
        >
          <Plus className="size-4" />
          {t("newCategory")}
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {categories.map((category) => (
            <li
              key={category.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">
                      {localize(category.name, locale)}
                    </h2>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        category.published
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {category.published ? t("statusPublished") : t("statusDraft")}
                    </span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {localize(category.description, locale)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    href={`/admin/cardapio/categorias/${category.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                    {t("edit")}
                  </Link>
                  <MenuCategoryDeleteButton
                    id={category.id}
                    name={localize(category.name, locale)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-3">
                {category.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("emptyItems")}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {category.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2"
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-medium">
                            {localize(item.name, locale)}
                          </h3>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              item.available
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {item.available ? t("statusAvailable") : t("statusUnavailable")}
                          </span>
                          {item.weekdays.length > 0 ? (
                            <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                              {[...item.weekdays]
                                .sort((a, b) => a - b)
                                .map((dia) => t(weekdayKeys[dia - 1]))
                                .join(", ")}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Link
                            href={`/admin/cardapio/itens/${item.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="size-4" />
                            {t("edit")}
                          </Link>
                          <MenuItemDeleteButton
                            id={item.id}
                            name={localize(item.name, locale)}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <Link
                  href={`/admin/cardapio/itens/new?categoria=${category.id}`}
                  className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand transition-colors hover:text-brand/80"
                >
                  <Plus className="size-4" />
                  {t("newItem")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
