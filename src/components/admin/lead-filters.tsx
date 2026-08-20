"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

const selectStyles =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors focus-visible:border-brand";

export type LeadFilterValues = {
  type?: string;
  status?: string;
  tag?: string;
};

export function LeadFilters({
  tags,
  current,
}: {
  tags: string[];
  current: LeadFilterValues;
}) {
  const t = useTranslations("admin.leads");
  const router = useRouter();
  const pathname = usePathname();

  function setParam(key: keyof LeadFilterValues, value: string) {
    const next: LeadFilterValues = { ...current, [key]: value || undefined };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasFilters = Boolean(current.type || current.status || current.tag);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-label={t("filterType")}
        className={selectStyles}
        value={current.type ?? ""}
        onChange={(e) => setParam("type", e.target.value)}
      >
        <option value="">{t("filterTypeAll")}</option>
        <option value="CONTACT">{t("typeContact")}</option>
      </select>

      <select
        aria-label={t("filterStatus")}
        className={selectStyles}
        value={current.status ?? ""}
        onChange={(e) => setParam("status", e.target.value)}
      >
        <option value="">{t("filterStatusAll")}</option>
        <option value="NEW">{t("statusNew")}</option>
        <option value="CONTACTED">{t("statusContacted")}</option>
        <option value="ARCHIVED">{t("statusArchived")}</option>
      </select>

      {tags.length > 0 ? (
        <select
          aria-label={t("filterTag")}
          className={selectStyles}
          value={current.tag ?? ""}
          onChange={(e) => setParam("tag", e.target.value)}
        >
          <option value="">{t("filterTagAll")}</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      ) : null}

      {hasFilters ? (
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
          {t("filterClear")}
        </Link>
      ) : null}
    </div>
  );
}
