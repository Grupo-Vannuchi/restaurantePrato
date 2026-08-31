import type { MenuItemKind } from "@prisma/client";
import { locales, type Locale } from "@/i18n/routing";
import type { MenuCategoryInput, MenuItemInput } from "@/lib/validations/menu";

/**
 * Ponte entre os formulários do cardápio e a forma armazenada (números e listas
 * como texto, mapas localizados). Sem "use client" nem "server-only" — os dois
 * lados importam este módulo.
 */

type LocalizedStrings = Record<Locale, string>;

function blankLocalized(): LocalizedStrings {
  return Object.fromEntries(locales.map((l) => [l, ""])) as LocalizedStrings;
}

function readLocalized(value: unknown): LocalizedStrings {
  const obj = (value ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    locales.map((l) => [l, typeof obj[l] === "string" ? (obj[l] as string) : ""]),
  ) as LocalizedStrings;
}

function trimLocalized(value: LocalizedStrings): LocalizedStrings {
  return Object.fromEntries(
    locales.map((l) => [l, value[l].trim()]),
  ) as LocalizedStrings;
}

// --- Categoria ---------------------------------------------------------------

export type MenuCategoryFormValues = {
  slug: string;
  name: LocalizedStrings;
  description: LocalizedStrings;
  order: string;
  published: boolean;
};

export function emptyMenuCategoryForm(): MenuCategoryFormValues {
  return {
    slug: "",
    name: blankLocalized(),
    description: blankLocalized(),
    order: "0",
    published: true,
  };
}

type MenuCategoryRow = {
  slug: string;
  name: unknown;
  description: unknown;
  order: number;
  published: boolean;
};

export function categoryToForm(c: MenuCategoryRow): MenuCategoryFormValues {
  return {
    slug: c.slug,
    name: readLocalized(c.name),
    description: readLocalized(c.description),
    order: String(c.order),
    published: c.published,
  };
}

export function categoryFormToInput(
  values: MenuCategoryFormValues,
): MenuCategoryInput {
  return {
    slug: values.slug.trim(),
    name: trimLocalized(values.name),
    description: trimLocalized(values.description),
    order: Number(values.order),
    published: values.published,
  };
}

// --- Item --------------------------------------------------------------------

export type MenuItemFormValues = {
  slug: string;
  categoryId: string;
  name: LocalizedStrings;
  description: LocalizedStrings;
  image: string;
  available: boolean;
  order: string;
  /** Lista separada por vírgula no formulário; array no banco. */
  tags: string;
  /** Texto longo, mostrado na linha do cardápio digital. */
  descriptionLong: LocalizedStrings;
  /** Em que seção do cardápio o prato entra. */
  kind: MenuItemKind;
  /**
   * Dias marcados no formulário. **Lista vazia = prato permanente**, servido
   * todos os dias — antes era a string vazia de um `<select>` de um dia só.
   */
  weekdays: number[];
};

export function emptyMenuItemForm(categoryId: string): MenuItemFormValues {
  return {
    slug: "",
    categoryId,
    name: blankLocalized(),
    description: blankLocalized(),
    image: "",
    available: true,
    order: "0",
    tags: "",
    descriptionLong: blankLocalized(),
    kind: "BUFFET",
    weekdays: [],
  };
}

type MenuItemRow = {
  slug: string;
  categoryId: string;
  name: unknown;
  description: unknown;
  image: string;
  available: boolean;
  order: number;
  tags: string[];
  descriptionLong: unknown;
  kind: MenuItemKind;
  weekdays: number[];
};

export function itemToForm(i: MenuItemRow): MenuItemFormValues {
  return {
    slug: i.slug,
    categoryId: i.categoryId,
    name: readLocalized(i.name),
    description: readLocalized(i.description),
    image: i.image,
    available: i.available,
    order: String(i.order),
    tags: i.tags.join(", "),
    descriptionLong: readLocalized(i.descriptionLong),
    kind: i.kind,
    weekdays: [...i.weekdays].sort((a, b) => a - b),
  };
}

export function itemFormToInput(values: MenuItemFormValues): MenuItemInput {
  return {
    slug: values.slug.trim(),
    categoryId: values.categoryId.trim(),
    name: trimLocalized(values.name),
    description: trimLocalized(values.description),
    image: values.image.trim(),
    available: values.available,
    order: Number(values.order),
    tags: values.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    descriptionLong: trimLocalized(values.descriptionLong),
    kind: values.kind,
    /*
     * ⚠️ `Number` antes de tudo: `register("weekdays")` em caixas de seleção
     * devolve os `value` do HTML, que são TEXTO. Sem converter, o `Set` não
     * juntaria "4" com 4 e este objeto mentiria sobre o próprio tipo — ele
     * declara `number[]` e entregaria `string[]`, com o zod coagindo depois e
     * escondendo o problema.
     *
     * Ordenados e sem repetido: a ordem em que a pessoa clica nas caixas não
     * deve virar a ordem no banco.
     */
    weekdays: [...new Set(values.weekdays.map(Number))].sort((a, b) => a - b),
  };
}
