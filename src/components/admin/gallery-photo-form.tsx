"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/field";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Link, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import {
  photoFormToInput,
  type GalleryPhotoFormValues,
} from "@/lib/gallery-form";
import {
  createGalleryPhoto,
  updateGalleryPhoto,
  type GalleryActionResult,
} from "@/app/actions/gallery";

const localeLabel = (locale: string) => locale.toUpperCase();

export function GalleryPhotoForm({
  mode,
  photoId,
  defaultValues,
}: {
  mode: "create" | "edit";
  photoId?: string;
  defaultValues: GalleryPhotoFormValues;
}) {
  const t = useTranslations("admin.galeria");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GalleryPhotoFormValues>({ defaultValues });

  async function onSubmit(values: GalleryPhotoFormValues) {
    setServerError(null);
    const input = photoFormToInput(values);
    try {
      const result: GalleryActionResult =
        mode === "edit" && photoId
          ? await updateGalleryPhoto(photoId, input)
          : await createGalleryPhoto(input);

      if (result.ok) {
        router.push("/admin/galeria");
        router.refresh();
      } else {
        setServerError(t("errorUnknown"));
      }
    } catch {
      // A ação nem chegou a responder: rede caída, servidor reiniciando,
      // deploy no meio da requisição. O react-hook-form devolve
      // `isSubmitting` a false no seu próprio `finally` e RELANÇA — então,
      // sem este ramo, o botão destravava e a tela não dizia nada. Diante
      // da ambiguidade a pessoa clica de novo e arrisca duplicar o registro.
      setServerError(t("errorUnknown"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8" noValidate>
      {/* Basics */}
      <fieldset className="rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">{t("sectionBasics")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ImageUploadField
              id="image"
              label={t("image")}
              hint={t("imageHint")}
              preset="gallery"
              value={watch("image") ?? ""}
              onChange={(v) => setValue("image", v, { shouldDirty: true })}
            />
          </div>
          <div>
            <Label htmlFor="order">{t("order")}</Label>
            <Input id="order" type="number" inputMode="numeric" {...register("order")} hint={t("orderHint")} />
          </div>
        </div>
      </fieldset>

      {/* Bilingual content, one block per locale */}
      {locales.map((locale) => (
        <fieldset key={locale} className="rounded-xl border border-border bg-card p-5">
          <legend className="px-1 text-sm font-semibold">
            {t("sectionContent", { locale: localeLabel(locale) })}
          </legend>
          <div>
            <Label htmlFor={`caption-${locale}`}>{t("caption")}</Label>
            <Textarea
              id={`caption-${locale}`}
              {...register(`caption.${locale}` as const)}
              error={errors.caption?.[locale]?.message}
              hint={t("captionHint")}
            />
          </div>
        </fieldset>
      ))}

      {/* Flags */}
      <fieldset className="rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">{t("sectionVisibility")}</legend>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="size-4 accent-brand" {...register("published")} />
          {t("published")}
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
          href="/admin/galeria"
          className="inline-flex h-13 items-center px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("cancel")}
        </Link>
      </div>
    </form>
  );
}
