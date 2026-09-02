"use server";

import { updateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { tags } from "@/lib/cache";
import {
  menuCategorySchema,
  menuItemSchema,
  type MenuCategoryInput,
  type MenuItemInput,
} from "@/lib/validations/menu";

export type MenuActionResult =
  | { ok: true; id: string }
  | { ok: false; error: "unauthorized" | "invalid" | "duplicate" | "unknown" };

/** Categorias e itens são sempre lidos juntos, então uma tag só invalida os
 * dois. `updateTag` (e não `revalidateTag`) para o admin ver a própria escrita
 * na visita seguinte, não na outra. */
function revalidateMenu(): void {
  updateTag(tags.menu);
}

/** Violação de unique do Prisma (slug repetido). */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

function categoryData(input: MenuCategoryInput) {
  return {
    slug: input.slug,
    name: input.name,
    description: input.description,
    order: input.order,
    published: input.published,
  };
}

function itemData(input: MenuItemInput) {
  return {
    slug: input.slug,
    categoryId: input.categoryId,
    name: input.name,
    description: input.description,
    image: input.image,
    available: input.available,
    order: input.order,
    tags: input.tags,
    descriptionLong: input.descriptionLong,
    kind: input.kind,
    weekdays: input.weekdays,
  };
}

export async function createMenuCategory(
  input: MenuCategoryInput,
): Promise<MenuActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = menuCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    const c = await prisma.menuCategory.create({
      data: categoryData(parsed.data),
    });
    revalidateMenu();
    return { ok: true, id: c.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "duplicate" };
    console.error("Failed to create menu category", error);
    return { ok: false, error: "unknown" };
  }
}

export async function updateMenuCategory(
  id: string,
  input: MenuCategoryInput,
): Promise<MenuActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = menuCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    const c = await prisma.menuCategory.update({
      where: { id },
      data: categoryData(parsed.data),
    });
    revalidateMenu();
    return { ok: true, id: c.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "duplicate" };
    console.error("Failed to update menu category", error);
    return { ok: false, error: "unknown" };
  }
}

/** Apaga a categoria. `onDelete: Cascade` no schema leva os itens junto — a UI
 * precisa avisar antes de chamar. */
export async function deleteMenuCategory(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  try {
    await prisma.menuCategory.delete({ where: { id } });
    revalidateMenu();
    return { ok: true };
  } catch (error) {
    console.error("Failed to delete menu category", error);
    return { ok: false };
  }
}

export async function createMenuItem(
  input: MenuItemInput,
): Promise<MenuActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    const i = await prisma.menuItem.create({ data: itemData(parsed.data) });
    revalidateMenu();
    return { ok: true, id: i.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "duplicate" };
    console.error("Failed to create menu item", error);
    return { ok: false, error: "unknown" };
  }
}

export async function updateMenuItem(
  id: string,
  input: MenuItemInput,
): Promise<MenuActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  try {
    const i = await prisma.menuItem.update({
      where: { id },
      data: itemData(parsed.data),
    });
    revalidateMenu();
    return { ok: true, id: i.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "duplicate" };
    console.error("Failed to update menu item", error);
    return { ok: false, error: "unknown" };
  }
}

export async function deleteMenuItem(id: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  try {
    await prisma.menuItem.delete({ where: { id } });
    revalidateMenu();
    return { ok: true };
  } catch (error) {
    console.error("Failed to delete menu item", error);
    return { ok: false };
  }
}
