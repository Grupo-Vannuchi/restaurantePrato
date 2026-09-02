"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Select } from "@/components/ui/field";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Link, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import { itemFormToInput, type MenuItemFormValues } from "@/lib/menu-form";
import {
  createMenuItem,
  updateMenuItem,
  type MenuActionResult,
} from "@/app/actions/menu";

const localeLabel = (locale: string) => locale.toUpperCase();

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
    try {
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
            <Label htmlFor="categoryId">{t("itemCategory")}</Label>
            <Select
              id="categoryId"
              error={errors.categoryId?.message}
              {...register("categoryId", required)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="slug">{t("itemSlug")}</Label>
            <Input
              id="slug"
              placeholder="picanha-na-brasa"
              {...register("slug", required)}
              error={errors.slug?.message}
              hint={t("itemSlugHint")}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="descriptionLong">{t("itemDescriptionLong")}</Label>
            <Textarea
              id="descriptionLong"
              rows={3}
              hint={t("itemDescriptionLongHint")}
              {...register("descriptionLong.pt")}
            />
          </div>
          <div>
            <Label htmlFor="tags">{t("itemTags")}</Label>
            <Input id="tags" {...register("tags")} hint={t("itemTagsHint")} />
          </div>
          <div>
            <Label htmlFor="kind">{t("itemKind")}</Label>
            <Select id="kind" hint={t("itemKindHint")} {...register("kind")}>
              <option value="BUFFET">{t("kindBuffet")}</option>
              <option value="PASTA">{t("kindPasta")}</option>
              <option value="SHOWCASE">{t("kindShowcase")}</option>
            </Select>
          </div>

          {/*
            Caixas de seleção, e não uma lista suspensa: o prato sai em mais de
            um dia, e o `<select>` de antes só comportava um. Um `<fieldset>`
            com legenda porque o rótulo aqui é do GRUPO — sem ele, quem usa
            leitor de tela ouve "Segunda, caixa de seleção" sem saber do quê.
          */}
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 block text-sm font-medium">
              {t("itemWeekdays")}
            </legend>
            <p className="mb-2 text-xs text-muted-foreground" id="dias-dica">
              {t("itemWeekdaysHint")}
            </p>
            <div
              className="flex flex-wrap gap-x-5 gap-y-2"
              aria-describedby="dias-dica"
            >
              {weekdays.map((n) => (
                <label key={n} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    value={n}
                    className="size-4 rounded border-border-field"
                    {...register("weekdays")}
                  />
                  {t(`weekday${n}`)}
                </label>
              ))}
            </div>
          </fieldset>
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
                {...register(`name.${locale}` as const, locale === locales[0] ? required : {})}
                error={errors.name?.[locale]?.message}
              />
            </div>
            <div>
              <Label htmlFor={`description-${locale}`}>{t("itemDescription")}</Label>
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
          <input type="checkbox" className="size-4 accent-brand" {...register("available")} />
          {t("available")}
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
