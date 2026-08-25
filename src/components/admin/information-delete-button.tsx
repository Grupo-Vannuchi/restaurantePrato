"use client";

import { useTranslations } from "next-intl";
import { deleteInformation } from "@/app/actions/informations";
import { DeleteButtonBase } from "@/components/admin/delete-button-base";

export function InformationDeleteButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const t = useTranslations("admin.novidades");

  return (
    <DeleteButtonBase
      label={t("delete")}
      confirmMessage={t("deleteConfirm", { title })}
      errorMessage={t("deleteError")}
      onDelete={() => deleteInformation(id)}
    />
  );
}
