import { getTranslations, setRequestLocale } from "next-intl/server";
import { Inbox, UtensilsCrossed, Images } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardStats, getRecentLeads } from "@/lib/admin-queries";
import { restaurantDateFormat } from "@/lib/dates";
import { resolveLocale } from "@/i18n/routing";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("admin.dashboard");

  const [user, stats, recentLeads] = await Promise.all([
    getCurrentUser(),
    getDashboardStats(),
    getRecentLeads(5),
  ]);

  const cards = [
    { label: t("newLeads"), value: stats.newLeads, icon: Inbox },
    { label: t("totalMenuItems"), value: stats.totalMenuItems, icon: UtensilsCrossed },
    { label: t("totalGalleryPhotos"), value: stats.totalGalleryPhotos, icon: Images },
  ];

  const dateFormatter = restaurantDateFormat(locale, {
    dateStyle: "medium",
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        {user ? (
          <p className="text-muted-foreground">
            {t("welcome", { name: user.name })}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-5"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <card.icon className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-4 font-semibold">
          {t("recentLeads")}
        </h2>
        <ul className="divide-y divide-border">
          {recentLeads.map((lead) => (
            <li
              key={lead.id}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0">
                <h3 className="truncate font-medium">{lead.name}</h3>
                <p className="truncate text-sm text-muted-foreground">
                  {lead.email}
                </p>
              </div>
              <time
                dateTime={lead.createdAt.toISOString()}
                className="shrink-0 text-sm text-muted-foreground"
              >
                {dateFormatter.format(lead.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
