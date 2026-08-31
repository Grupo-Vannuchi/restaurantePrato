import { z } from "zod";
import { locales, defaultLocale, type Locale } from "@/i18n/routing";

/**
 * Validação do editor de cardápio. Categoria e item.
 *
 * ⚠️ Não existe campo de preço. Isso foi direção de produto do cliente anterior,
 * herdada no fork — não é uma regra deste código. Se o Restaurante Prato quiser
 * exibir preço, é mudança de schema, admin e validação: ver a pergunta aberta
 * §4.1 em
 * `docs/superpowers/specs/2026-08-17-whitelabel-restaurante-prato-design.md`.
 *
 * O formulário do cliente coleta valores planos e os mapeia para estas formas
 * antes de enviar; a server action revalida com o mesmo schema, como boundary.
 */

/** Constrói um validador `{ pt }`: o locale padrão é obrigatório, os demais não. */
function localizedText(max: number) {
  return z.object(
    Object.fromEntries(
      locales.map((l) => [
        l,
        l === defaultLocale
          ? z.string().trim().min(1, "Required").max(max)
          : z.string().trim().max(max),
      ]),
    ) as Record<Locale, z.ZodString>,
  );
}

/** Opcional em todos os locales — usado por descrições. */
function optionalLocalizedText(max: number) {
  return z.object(
    Object.fromEntries(
      locales.map((l) => [l, z.string().trim().max(max)]),
    ) as Record<Locale, z.ZodString>,
  );
}

const slug = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use minúsculas, números e hífens");

const url = z.string().trim().url().max(500);

export const menuCategorySchema = z.object({
  slug,
  name: localizedText(80),
  description: optionalLocalizedText(300),
  order: z.coerce.number().int().min(0).max(9999),
  published: z.boolean(),
});

export const menuItemSchema = z.object({
  slug,
  categoryId: z.string().trim().min(1),
  name: localizedText(120),
  description: optionalLocalizedText(600),
  image: z.union([url, z.literal("")]),
  available: z.boolean(),
  order: z.coerce.number().int().min(0).max(9999),
  tags: z.array(z.string().trim().min(1).max(40)).max(10),
  descriptionLong: optionalLocalizedText(2000),
  /// Em que seção do cardápio o prato entra.
  kind: z.enum(["BUFFET", "PASTA", "SHOWCASE"]),
  /**
   * 1 = segunda … 5 = sexta. O restaurante não abre no fim de semana, então
   * não existe 6 nem 7 — e a validação recusa em vez de aceitar um dia que a
   * casa nunca vai servir.
   *
   * Lista vazia = prato permanente. `max(5)` porque cinco dias é o teto: uma
   * lista maior só pode ter repetido.
   */
  weekdays: z.array(z.coerce.number().int().min(1).max(5)).max(5),
});

export type MenuCategoryInput = z.infer<typeof menuCategorySchema>;
export type MenuItemInput = z.infer<typeof menuItemSchema>;
