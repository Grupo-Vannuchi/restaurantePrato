"use client";

import { useTranslations } from "next-intl";
import type { LeadStatus } from "@prisma/client";
import { updateLeadStatus } from "@/app/actions/admin";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";

export function LeadStatusButtons({
  id,
  status,
}: {
  id: string;
  status: LeadStatus;
}) {
  const t = useTranslations("admin.leads");
  const { pending, erro, run } = useAdminAction({
    errorMessage: t("updateError"),
    successMessage: t("updateSuccess"),
  });

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
      <StatusMessage tone="error">{erro}</StatusMessage>
    </div>
  );
}
