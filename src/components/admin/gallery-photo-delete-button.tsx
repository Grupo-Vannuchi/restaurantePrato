"use client";

import { useTranslations } from "next-intl";
import { deleteGalleryPhoto } from "@/app/actions/gallery";
import { DeleteButtonBase } from "@/components/admin/delete-button-base";

export function GalleryPhotoDeleteButton({ id }: { id: string }) {
  const t = useTranslations("admin.galeria");

  return (
    <DeleteButtonBase
      label={t("delete")}
      confirmMessage={t("deleteConfirm")}
      errorMessage={t("deleteError")}
      onDelete={() => deleteGalleryPhoto(id)}
    />
  );
}
