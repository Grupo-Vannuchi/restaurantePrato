"use client";

import { useTranslations } from "next-intl";
import type { LeadStatus } from "@prisma/client";
import { updateLeadStatus } from "@/app/actions/admin";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { Button } from "@/components/ui/button";

export function LeadStatusButtons({
  id,
  status,
}: {
  id: string;
  status: LeadStatus;
}) {
  const t = useTranslations("admin.leads");
  const { pending, erro, run } = useAdminAction(t("updateError"));

  function setStatus(next: LeadStatus) {
    void run(() => updateLeadStatus(id, next));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "CONTACTED" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => setStatus("CONTACTED")}
        >
          {t("markContacted")}
        </Button>
      ) : null}
      {status !== "ARCHIVED" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setStatus("ARCHIVED")}
        >
          {t("archive")}
        </Button>
      ) : null}
      {erro ? <span className="text-xs text-red-500">{erro}</span> : null}
    </div>
  );
}
