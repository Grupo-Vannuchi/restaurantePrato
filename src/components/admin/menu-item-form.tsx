"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, FieldError } from "@/components/ui/field";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Link, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { itemFormToInput, type MenuItemFormValues } from "@/lib/menu-form";
import {
  createMenuItem,
  updateMenuItem,
  type MenuActionResult,
} from "@/app/actions/menu";

const localeLabel = (locale: string) => locale.toUpperCase();

const selectStyles =
  "w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm transition-colors focus-visible:border-brand aria-[invalid=true]:border-red-500";

/** 1 = segunda … 5 = sexta — o restaurante não abre no fim de semana. */
const weekdays = [1, 2, 3, 4, 5] as const;

export function MenuItemForm({
  mode,
  itemId,
  categories,
  defaultValues,
}: {
  mode: "create" | "edit";
  itemId?: string;
  categories: { id: string; name: string }[];
  defaultValues: MenuItemFormValues;
}) {
  const t = useTranslations("admin.cardapio");
  const tv = useTranslations("validation");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MenuItemFormValues>({ defaultValues });

  async function onSubmit(values: MenuItemFormValues) {
    setServerError(null);
    const input = itemFormToInput(values);
    const result: MenuActionResult =
      mode === "edit" && itemId
        ? await updateMenuItem(itemId, input)
        : await createMenuItem(input);

    if (result.ok) {
      router.push("/admin/cardapio");
      router.refresh();
    } else if (result.error === "duplicate") {
      setServerError(t("errorDuplicate"));
    } else {
      setServerError(t("errorUnknown"));
    }
  }

  const required = { required: tv("required") };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8" noValidate>
      {/* Basics */}
      <fieldset className="rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">{t("sectionBasics")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="categoryId">{t("itemCategory")}</Label>
            <select
              id="categoryId"
              aria-invalid={Boolean(errors.categoryId)}
              className={cn(selectStyles)}
              {...register("categoryId", required)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError>{errors.categoryId?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="slug">{t("itemSlug")}</Label>
            <Input
              id="slug"
              placeholder="picanha-na-brasa"
              aria-invalid={Boolean(errors.slug)}
              {...register("slug", required)}
            />
            <FieldError>{errors.slug?.message}</FieldError>
            <p className="mt-1 text-xs text-muted-foreground">{t("itemSlugHint")}</p>
          </div>
          <div>
            <Label htmlFor="tags">{t("itemTags")}</Label>
            <Input id="tags" {...register("tags")} />
            <p className="mt-1 text-xs text-muted-foreground">{t("itemTagsHint")}</p>
          </div>
          <div>
            <Label htmlFor="weekday">{t("itemWeekday")}</Label>
            <select id="weekday" className={cn(selectStyles)} {...register("weekday")}>
              <option value="">{t("weekdayNone")}</option>
              {weekdays.map((n) => (
                <option key={n} value={n}>
                  {t(`weekday${n}`)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">{t("itemWeekdayHint")}</p>
          </div>
          <div>
            <Label htmlFor="order">{t("order")}</Label>
            <Input id="order" type="number" inputMode="numeric" {...register("order")} />
          </div>
          <div className="sm:col-span-2">
            <ImageUploadField
              id="image"
              label={t("itemImage")}
              preset="cover"
              value={watch("image") ?? ""}
              onChange={(v) => setValue("image", v, { shouldDirty: true })}
            />
          </div>
        </div>
      </fieldset>

      {/* Bilingual content, one block per locale */}
      {locales.map((locale) => (
        <fieldset key={locale} className="rounded-xl border border-border bg-card p-5">
          <legend className="px-1 text-sm font-semibold">
            {t("sectionContent", { locale: localeLabel(locale) })}
          </legend>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor={`name-${locale}`}>{t("itemName")}</Label>
              <Input
                id={`name-${locale}`}
                aria-invalid={Boolean(errors.name?.[locale])}
                {...register(`name.${locale}` as const, locale === locales[0] ? required : {})}
              />
              <FieldError>{errors.name?.[locale]?.message}</FieldError>
            </div>
            <div>
              <Label htmlFor={`description-${locale}`}>{t("itemDescription")}</Label>
              <Textarea
                id={`description-${locale}`}
                aria-invalid={Boolean(errors.description?.[locale])}
                {...register(`description.${locale}` as const)}
              />
              <FieldError>{errors.description?.[locale]?.message}</FieldError>
            </div>
          </div>
        </fieldset>
      ))}

      {/* Flags */}
      <fieldset className="rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">{t("sectionVisibility")}</legend>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="size-4 accent-brand" {...register("available")} />
          {t("available")}
        </label>
      </fieldset>

      {serverError ? (
        <p role="alert" className="text-sm text-red-500">
          {serverError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : t("save")}
        </Button>
        <Link
          href="/admin/cardapio"
          className="inline-flex h-13 items-center px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("cancel")}
        </Link>
      </div>
    </form>
  );
}
