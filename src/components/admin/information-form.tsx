"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/field";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Icon, iconNames } from "@/components/ui/icon";
import { Link, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import { formToInput, type InformationFormValues } from "@/lib/information-form";
import {
  createInformation,
  updateInformation,
  type InformationActionResult,
} from "@/app/actions/informations";

/** Display name for a locale tab/label (e.g. "PT", "EN"). */
const localeLabel = (locale: string) => locale.toUpperCase();

export function InformationForm({
  mode,
  informationId,
  defaultValues,
}: {
  mode: "create" | "edit";
  informationId?: string;
  defaultValues: InformationFormValues;
}) {
  const t = useTranslations("admin.novidades");
  const tv = useTranslations("validation");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InformationFormValues>({ defaultValues });

  const selectedIcon = watch("icon");

  async function onSubmit(values: InformationFormValues) {
    setServerError(null);
    const input = formToInput(values);
    try {
      const result: InformationActionResult =
        mode === "edit" && informationId
          ? await updateInformation(informationId, input)
          : await createInformation(input);

      if (result.ok) {
        router.push("/admin/novidades");
        router.refresh();
      } else {
        setServerError(t(`error.${result.error}`));
      }
    } catch {
      // A ação nem chegou a responder: rede caída, servidor reiniciando,
      // deploy no meio da requisição. O react-hook-form devolve
      // `isSubmitting` a false no seu próprio `finally` e RELANÇA — então,
      // sem este ramo, o botão destravava e a tela não dizia nada. Diante
      // da ambiguidade a pessoa clica de novo e arrisca duplicar o registro.
      setServerError(t("error.unknown"));
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
            <Label htmlFor="slug">{t("slug")}</Label>
            <Input
              id="slug"
              placeholder="company-history"
              {...register("slug", required)}
              hint={t("slugHint")}
              error={errors.slug?.message}
            />
          </div>
          <div>
            <Label htmlFor="icon">{t("icon")}</Label>
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Icon name={selectedIcon} className="size-5" />
              </span>
              <Select
                id="icon"
                aria-describedby="icon-dica"
                error={errors.icon?.message}
                {...register("icon", required)}
              >
                <option value="">{t("iconPlaceholder")}</option>
                {iconNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <p id="icon-dica" className="mt-1 text-xs text-muted-foreground">
              {t("iconHint")}
            </p>
          </div>
          <div>
            <Label htmlFor="order">{t("order")}</Label>
            <Input id="order" type="number" inputMode="numeric" {...register("order")} hint={t("orderHint")} />
          </div>
          <div className="sm:col-span-2">
            <ImageUploadField
              id="image"
              label={t("image")}
              hint={t("imageHint")}
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
              <Label htmlFor={`title-${locale}`}>{t("titleField")}</Label>
              <Input
                id={`title-${locale}`}
                {...register(`title.${locale}` as const, locale === locales[0] ? required : {})}
                error={errors.title?.[locale]?.message}
              />
            </div>
            <div>
              <Label htmlFor={`description-${locale}`}>{t("description")}</Label>
              <Textarea
                id={`description-${locale}`}
                {...register(
                  `description.${locale}` as const,
                  locale === locales[0] ? required : {},
                )}
                error={errors.description?.[locale]?.message}
              />
            </div>
            <div>
              <Label htmlFor={`content-${locale}`}>{t("content")}</Label>
              <Textarea
                id={`content-${locale}`}
                className="min-h-40"
                {...register(
                  `content.${locale}` as const,
                  locale === locales[0] ? required : {},
                )}
                error={errors.content?.[locale]?.message}
                hint={t("contentHint")}
              />
            </div>
          </div>
        </fieldset>
      ))}

      {/* Flags */}
      <fieldset className="rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">{t("sectionVisibility")}</legend>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="size-4 accent-brand" {...register("published")} />
            {t("published")}
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="size-4 accent-brand" {...register("featured")} />
            {t("featured")}
          </label>
        </div>
      </fieldset>

      {serverError ? (
        <p role="alert" className="text-sm text-red-500">
          {serverError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? t("saving") : mode === "create" ? t("create") : t("save")}
        </Button>
        <Link
          href="/admin/novidades"
          className="inline-flex h-13 items-center px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("cancel")}
        </Link>
      </div>
    </form>
  );
}
