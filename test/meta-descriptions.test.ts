import { describe, expect, it } from "vitest";

import pt from "../src/messages/pt.json";

/**
 * Descrição de busca de cada página pública.
 *
 * É o texto que aparece sob o título no Google. Curto demais, o Google
 * descarta e escreve o resumo sozinho, recortando um pedaço qualquer da
 * página — e aí quem decide como o restaurante se apresenta é o buscador.
 * Longo demais, ele corta no meio da frase.
 *
 * A faixa útil fica entre 120 e 160 caracteres. Em 20/08/2026, cinco das sete
 * páginas estavam abaixo de 95, porque caíam no `subtitle` — que é copy de
 * página, curta por natureza, e nunca foi escrita para essa função.
 *
 * O limite superior é folgado (170): estourar por uma palavra não é defeito,
 * mas dobrar de tamanho é sinal de que alguém colou um parágrafo aqui.
 */
const MINIMO = 120;
const MAXIMO = 170;

const PAGINAS: Record<string, string> = {
  "/": pt.metadata.description,
  "/experiencia": pt.experiencia.metaDescription,
  "/gastronomia": pt.gastronomia.metaDescription,
  "/galeria": pt.galeria.metaDescription,
  "/reservas": pt.reservas.metaDescription,
  "/contato": pt.contact.metaDescription,
  "/novidades": pt.novidades.metaDescription,
};

describe("descrições de busca", () => {
  it.each(Object.entries(PAGINAS))(
    "%s tem descrição no tamanho útil",
    (_rota, texto) => {
      expect(texto.length).toBeGreaterThanOrEqual(MINIMO);
      expect(texto.length).toBeLessThanOrEqual(MAXIMO);
    },
  );

  it("nenhuma descrição se repete entre páginas", () => {
    // Descrições iguais em páginas diferentes fazem o Google escolher uma
    // página e ignorar as outras para a mesma busca.
    const textos = Object.values(PAGINAS);
    expect(new Set(textos).size).toBe(textos.length);
  });
});
