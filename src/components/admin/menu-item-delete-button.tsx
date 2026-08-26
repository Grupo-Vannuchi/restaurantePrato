"use client";

import { useTranslations } from "next-intl";
import { deleteMenuItem } from "@/app/actions/menu";
import { DeleteButtonBase } from "@/components/admin/delete-button-base";

export function MenuItemDeleteButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const t = useTranslations("admin.cardapio");

  return (
    <DeleteButtonBase
      label={t("delete")}
      confirmMessage={t("deleteItemConfirm", { name })}
      errorMessage={t("deleteError")}
      successMessage={t("deleteItemSuccess")}
      onDelete={() => deleteMenuItem(id)}
    />
  );
}
