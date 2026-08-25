"use client";

import { useTranslations } from "next-intl";
import { deleteMenuCategory } from "@/app/actions/menu";
import { DeleteButtonBase } from "@/components/admin/delete-button-base";

export function MenuCategoryDeleteButton({
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
      confirmMessage={t("deleteCategoryConfirm", { name })}
      errorMessage={t("deleteError")}
      onDelete={() => deleteMenuCategory(id)}
    />
  );
}
