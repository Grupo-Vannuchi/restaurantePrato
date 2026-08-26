"use client";

import { useTranslations } from "next-intl";
import { deleteTestimonial } from "@/app/actions/testimonials";
import { DeleteButtonBase } from "@/components/admin/delete-button-base";

export function TestimonialDeleteButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const t = useTranslations("admin.testimonials");

  return (
    <DeleteButtonBase
      label={t("delete")}
      confirmMessage={t("deleteConfirm", { name })}
      errorMessage={t("deleteError")}
      successMessage={t("deleteSuccess")}
      onDelete={() => deleteTestimonial(id)}
    />
  );
}
