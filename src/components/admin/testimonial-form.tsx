"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/field";
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
  "w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm transition-colors focus-visible:border-brand aria-[invalid=true]:border-danger";

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
    try {
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
            <Label htmlFor="authorName">{t("authorName")}</Label>
            <Input
              id="authorName"
              {...register("authorName", required)}
              error={errors.authorName?.message}
            />
          </div>
          <div>
            <Label htmlFor="source">{t("source")}</Label>
            <Input
              id="source"
              {...register("source", required)}
              error={errors.source?.message}
              hint={t("sourceHint")}
            />
          </div>
          <div>
            <Label htmlFor="sourceUrl">{t("sourceUrl")}</Label>
            <Input
              id="sourceUrl"
              placeholder="https://maps.google.com/…"
              {...register("sourceUrl")}
              error={errors.sourceUrl?.message}
              hint={t("sourceUrlHint")}
            />
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
            <Input id="order" type="number" inputMode="numeric" {...register("order")} hint={t("orderHint")} />
          </div>
          <div className="sm:col-span-2">
            <ImageUploadField
              id="avatarUrl"
              label={t("avatarUrl")}
              hint={t("avatarUrlHint")}
              preset="avatar"
              value={watch("avatarUrl") ?? ""}
              onChange={(v) => setValue("avatarUrl", v, { shouldDirty: true })}
              error={errors.avatarUrl?.message}
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
              <Label htmlFor={`quote-${locale}`}>{t("quote")}</Label>
              <Textarea
                id={`quote-${locale}`}
                {...register(`quote.${locale}` as const, locale === locales[0] ? required : {})}
                error={errors.quote?.[locale]?.message}
              />
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
        <p role="alert" className="text-sm text-danger">
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
