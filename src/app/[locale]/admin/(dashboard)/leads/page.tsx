import { getTranslations, setRequestLocale } from "next-intl/server";
import { MessagesSquare } from "lucide-react";
import type { LeadStatus, LeadType } from "@prisma/client";
import { getLeads, getLeadTags } from "@/lib/admin-queries";
import { LeadStatusButtons } from "@/components/admin/lead-status-buttons";
import { LeadFilters } from "@/components/admin/lead-filters";
import { LeadTags } from "@/components/admin/lead-tags";
import { LeadNotifyConfig } from "@/components/admin/lead-notify-config";
import { LeadForwardButton } from "@/components/admin/lead-forward-button";
import { sourceLabel } from "@/lib/attribution";
import { restaurantDateFormat } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { resolveLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

const statusStyles: Record<LeadStatus, string> = {
  NEW: "bg-brand/10 text-brand",
  CONTACTED: "bg-emerald-500/10 text-emerald-600",
  ARCHIVED: "bg-muted text-muted-foreground",
};

/** Read the first value of a `searchParams` entry that may be string | string[]. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const LEAD_TYPES: LeadType[] = ["CONTACT"];
const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "ARCHIVED"];

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("admin.leads");

  const sp = await searchParams;
  const rawType = first(sp.type);
  const rawStatus = first(sp.status);
  const type = LEAD_TYPES.includes(rawType as LeadType)
    ? (rawType as LeadType)
    : undefined;
  const status = LEAD_STATUSES.includes(rawStatus as LeadStatus)
    ? (rawStatus as LeadStatus)
    : undefined;
  const tag = first(sp.tag) || undefined;

  const [leads, allTags] = await Promise.all([
    getLeads({ type, status, tag }),
    getLeadTags(),
  ]);

  const typeLabel: Record<LeadType, string> = {
    CONTACT: t("typeContact"),
  };
  const statusLabel: Record<LeadStatus, string> = {
    NEW: t("statusNew"),
    CONTACTED: t("statusContacted"),
    ARCHIVED: t("statusArchived"),
  };
  const dateFormatter = restaurantDateFormat(locale, { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Link
          href="/admin/leads/whatsapp"
          className={cn(buttonVariants({ variant: "outline", size: "md" }))}
        >
          <MessagesSquare className="size-4" />
          {t("whatsappLink")}
        </Link>
      </div>

      <LeadNotifyConfig />

      <LeadFilters tags={allTags} current={{ type, status, tag }} />

      {leads.length === 0 ? (
        <p className="text-muted-foreground">
          {type || status || tag ? t("emptyFiltered") : t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {leads.map((lead) => (
            <li
              key={lead.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{lead.name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {typeLabel[lead.type]}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        statusStyles[lead.status],
                      )}
                    >
                      {statusLabel[lead.status]}
                    </span>
                    {lead.whatsappNotifiedAt ? (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        {t("whatsappSent")}
                      </span>
                    ) : null}
                  </div>
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {lead.email}
                  </a>
                  {lead.phone ? (
                    <span className="text-sm text-muted-foreground">
                      {" · "}
                      {lead.phone}
                    </span>
                  ) : null}
                </div>
                <time
                  dateTime={lead.createdAt.toISOString()}
                  className="shrink-0 text-sm text-muted-foreground"
                >
                  {dateFormatter.format(lead.createdAt)}
                </time>
              </div>

              {lead.company ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {lead.company}
                </p>
              ) : null}

              <p className="mt-3 whitespace-pre-wrap text-sm">{lead.message}</p>

              {lead.referrer || lead.landingPage || lead.utmSource ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {t("source")}:
                  </span>{" "}
                  {sourceLabel({
                    referrer: lead.referrer ?? undefined,
                    utmSource: lead.utmSource ?? undefined,
                  })}
                  {lead.landingLabel || lead.landingPage
                    ? ` · ${t("landedOn")}: ${lead.landingLabel ?? lead.landingPage}`
                    : ""}
                  {lead.utmCampaign ? ` · ${lead.utmCampaign}` : ""}
                </p>
              ) : null}

              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                <LeadTags id={lead.id} tags={lead.tags} />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <LeadStatusButtons id={lead.id} status={lead.status} />
                  <LeadForwardButton id={lead.id} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
