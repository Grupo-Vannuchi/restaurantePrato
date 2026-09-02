import { describe, it, expect } from "vitest";
import {
  emptyMenuCategoryForm,
  categoryFormToInput,
  emptyMenuItemForm,
  itemFormToInput,
  itemToForm,
} from "@/lib/menu-form";
import { menuCategorySchema, menuItemSchema } from "@/lib/validations/menu";

describe("categoria do cardápio", () => {
  it("o formulário vazio não passa na validação (nome é obrigatório)", () => {
    const input = categoryFormToInput(emptyMenuCategoryForm());
    expect(menuCategorySchema.safeParse(input).success).toBe(false);
  });

  it("preenchido, passa e converte a ordem para número", () => {
    const values = emptyMenuCategoryForm();
    values.slug = "entradas";
    values.name.pt = "Entradas";
    values.order = "3";
    const input = categoryFormToInput(values);
    expect(input.order).toBe(3);
    expect(menuCategorySchema.safeParse(input).success).toBe(true);
  });

  it("apara espaços do nome e do slug", () => {
    const values = emptyMenuCategoryForm();
    values.slug = "  sobremesas  ";
    values.name.pt = "  Sobremesas  ";
    const input = categoryFormToInput(values);
    expect(input.slug).toBe("sobremesas");
    expect(input.name.pt).toBe("Sobremesas");
  });
});

describe("item do cardápio", () => {
  it("o formulário vazio não passa (nome e categoria obrigatórios)", () => {
    const input = itemFormToInput(emptyMenuItemForm(""));
    expect(menuItemSchema.safeParse(input).success).toBe(false);
  });

  it("preenchido, passa na validação", () => {
    const values = emptyMenuItemForm("cat_1");
    values.slug = "picanha";
    values.name.pt = "Picanha na brasa";
    const input = itemFormToInput(values);
    expect(input.categoryId).toBe("cat_1");
    expect(menuItemSchema.safeParse(input).success).toBe(true);
  });

  /*
   * O prato passou a sair em VÁRIOS dias.
   *
   * Antes era um `weekday` só, com `null` querendo dizer "permanente" — e cada
   * consumidor precisava lembrar do caso especial. Agora é uma lista, e a lista
   * vazia diz a mesma coisa sem exigir que ninguém se lembre.
   *
   * A troca não é cosmética: o mesmo prato reaparece na semana, e duplicar o
   * cadastro por dia significaria corrigir a mesma descrição em dois lugares.
   */
  it("nenhum dia marcado quer dizer prato permanente", () => {
    const values = emptyMenuItemForm("cat_1");
    values.slug = "feijoada";
    values.name.pt = "Feijoada";
    expect(itemFormToInput(values).weekdays).toEqual([]);
  });

  it("aceita vários dias, e os devolve em ordem e sem repetido", () => {
    const values = emptyMenuItemForm("cat_1");
    values.slug = "assado";
    values.name.pt = "Assado";
    // A ordem em que a pessoa clica nas caixas não deve virar a ordem no banco.
    values.weekdays = [4, 1, 4];
    expect(itemFormToInput(values).weekdays).toEqual([1, 4]);
  });

  it("converte o que as caixas de seleção devolvem, que é texto", () => {
    /*
     * ⚠️ `register("weekdays")` em caixas de seleção devolve os `value` do HTML
     * — TEXTO, não número. O tipo do formulário diz `number[]`, então sem esta
     * conversão o objeto que sai daqui mentiria sobre si mesmo: `new Set` não
     * juntaria "4" com 4, e o banco receberia o que o zod coagisse, não o que
     * este código diz devolver.
     */
    const values = emptyMenuItemForm("cat_1");
    values.slug = "assado";
    values.name.pt = "Assado";
    values.weekdays = ["2", "5", "2"] as unknown as number[];
    const saida = itemFormToInput(values).weekdays;
    expect(saida).toEqual([2, 5]);
    expect(saida.every((d) => typeof d === "number")).toBe(true);
  });

  it("recusa dia fora de 1–5 (o restaurante abre de segunda a sexta)", () => {
    const values = emptyMenuItemForm("cat_1");
    values.slug = "x";
    values.name.pt = "X";
    values.weekdays = [6];
    expect(menuItemSchema.safeParse(itemFormToInput(values)).success).toBe(false);
  });

  it("o tipo do prato entra no que vai para o banco", () => {
    const values = emptyMenuItemForm("cat_1");
    values.slug = "talharim";
    values.name.pt = "Talharim";
    // Buffet é o padrão: quem cadastra sem pensar nisso cai na seção certa.
    expect(itemFormToInput(values).kind).toBe("BUFFET");
    values.kind = "PASTA";
    expect(itemFormToInput(values).kind).toBe("PASTA");
  });

  it("separa as tags por vírgula, aparando e descartando vazias", () => {
    const values = emptyMenuItemForm("cat_1");
    values.slug = "salada";
    values.name.pt = "Salada";
    values.tags = " vegetariano , , picante ";
    expect(itemFormToInput(values).tags).toEqual(["vegetariano", "picante"]);
  });

  it("itemToForm devolve as tags como texto separado por vírgula", () => {
    const form = itemToForm({
      slug: "salada",
      categoryId: "cat_1",
      name: { pt: "Salada" },
      description: { pt: "" },
      image: "",
      available: true,
      order: 0,
      tags: ["vegetariano", "leve"],
      descriptionLong: { pt: "" },
      kind: "BUFFET",
      weekdays: [],
    });
    expect(form.tags).toBe("vegetariano, leve");
    expect(form.weekdays).toEqual([]);
  });

  it("itemToForm ordena os dias que vêm do banco", () => {
    // O banco guarda o que foi salvo; a ordem lá não é garantida por nada.
    const form = itemToForm({
      slug: "assado",
      categoryId: "cat_1",
      name: { pt: "Assado" },
      description: { pt: "" },
      image: "",
      available: true,
      order: 0,
      tags: [],
      descriptionLong: { pt: "" },
      kind: "BUFFET",
      weekdays: [5, 2],
    });
    expect(form.weekdays).toEqual([2, 5]);
  });
});
