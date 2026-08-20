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
import { formToInput, type TestimonialFormValues } from "@/lib/testimonial-form";
import {
  createTestimonial,
  updateTestimonial,
  type TestimonialActionResult,
} from "@/app/actions/testimonials";

const localeLabel = (locale: string) => locale.toUpperCase();

const selectStyles =
  "w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm transition-colors focus-visible:border-brand aria-[invalid=true]:border-red-500";

export function TestimonialForm({
  mode,
  testimonialId,
  defaultValues,
}: {
  mode: "create" | "edit";
  testimonialId?: string;
  defaultValues: TestimonialFormValues;
}) {
  const t = useTranslations("admin.testimonials");
  const tv = useTranslations("validation");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TestimonialFormValues>({ defaultValues });

  async function onSubmit(values: TestimonialFormValues) {
    setServerError(null);
    const input = formToInput(values);
    const result: TestimonialActionResult =
      mode === "edit" && testimonialId
        ? await updateTestimonial(testimonialId, input)
        : await createTestimonial(input);

    if (result.ok) {
      router.push("/admin/testimonials");
      router.refresh();
    } else {
      setServerError(t(`error.${result.error}`));
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
            <Label htmlFor="authorName">{t("authorName")}</Label>
            <Input
              id="authorName"
              aria-invalid={Boolean(errors.authorName)}
              {...register("authorName", required)}
            />
            <FieldError>{errors.authorName?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="source">{t("source")}</Label>
            <Input
              id="source"
              aria-invalid={Boolean(errors.source)}
              {...register("source", required)}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("sourceHint")}</p>
            <FieldError>{errors.source?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="sourceUrl">{t("sourceUrl")}</Label>
            <Input
              id="sourceUrl"
              placeholder="https://maps.google.com/…"
              aria-invalid={Boolean(errors.sourceUrl)}
              {...register("sourceUrl")}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("sourceUrlHint")}</p>
            <FieldError>{errors.sourceUrl?.message}</FieldError>
          </div>
          <div>
            <Label htmlFor="rating">{t("rating")}</Label>
            <select id="rating" className={cn(selectStyles)} {...register("rating")}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {t("stars", { count: n })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="order">{t("order")}</Label>
            <Input id="order" type="number" inputMode="numeric" {...register("order")} />
            <p className="mt-1 text-xs text-muted-foreground">{t("orderHint")}</p>
          </div>
          <div className="sm:col-span-2">
            <ImageUploadField
              id="avatarUrl"
              label={t("avatarUrl")}
              hint={t("avatarUrlHint")}
              preset="avatar"
              value={watch("avatarUrl") ?? ""}
              onChange={(v) => setValue("avatarUrl", v, { shouldDirty: true })}
            />
            <FieldError>{errors.avatarUrl?.message}</FieldError>
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
              <Label htmlFor={`quote-${locale}`}>{t("quote")}</Label>
              <Textarea
                id={`quote-${locale}`}
                aria-invalid={Boolean(errors.quote?.[locale])}
                {...register(`quote.${locale}` as const, locale === locales[0] ? required : {})}
              />
              <FieldError>{errors.quote?.[locale]?.message}</FieldError>
            </div>
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
          {isSubmitting ? t("saving") : mode === "create" ? t("create") : t("save")}
        </Button>
        <Link
          href="/admin/testimonials"
          className="inline-flex h-13 items-center px-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("cancel")}
        </Link>
      </div>
    </form>
  );
}
