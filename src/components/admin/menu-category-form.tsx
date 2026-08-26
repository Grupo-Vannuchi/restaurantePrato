"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/field";
import { Link, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import {
  categoryFormToInput,
  type MenuCategoryFormValues,
} from "@/lib/menu-form";
import {
  createMenuCategory,
  updateMenuCategory,
  type MenuActionResult,
} from "@/app/actions/menu";

const localeLabel = (locale: string) => locale.toUpperCase();

export function MenuCategoryForm({
  mode,
  categoryId,
  defaultValues,
}: {
  mode: "create" | "edit";
  categoryId?: string;
  defaultValues: MenuCategoryFormValues;
}) {
  const t = useTranslations("admin.cardapio");
  const tv = useTranslations("validation");
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MenuCategoryFormValues>({ defaultValues });

  async function onSubmit(values: MenuCategoryFormValues) {
    setServerError(null);
    const input = categoryFormToInput(values);
    try {
      const result: MenuActionResult =
        mode === "edit" && categoryId
          ? await updateMenuCategory(categoryId, input)
          : await createMenuCategory(input);

      if (result.ok) {
        router.push("/admin/cardapio");
        router.refresh();
      } else if (result.error === "duplicate") {
        setServerError(t("errorDuplicate"));
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

  const required = { required: tv("required") };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8" noValidate>
      {/* Basics */}
      <fieldset className="rounded-xl border border-border bg-card p-5">
        <legend className="px-1 text-sm font-semibold">{t("sectionBasics")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="slug">{t("categorySlug")}</Label>
            <Input
              id="slug"
              placeholder="entradas"
              {...register("slug", required)}
              error={errors.slug?.message}
              hint={t("categorySlugHint")}
            />
          </div>
          <div>
            <Label htmlFor="order">{t("order")}</Label>
            <Input id="order" type="number" inputMode="numeric" {...register("order")} />
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
              <Label htmlFor={`name-${locale}`}>{t("categoryName")}</Label>
              <Input
                id={`name-${locale}`}
                {...register(`name.${locale}` as const, locale === locales[0] ? required : {})}
                error={errors.name?.[locale]?.message}
              />
            </div>
            <div>
              <Label htmlFor={`description-${locale}`}>{t("categoryDescription")}</Label>
              <Textarea
                id={`description-${locale}`}
                {...register(`description.${locale}` as const)}
                error={errors.description?.[locale]?.message}
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
