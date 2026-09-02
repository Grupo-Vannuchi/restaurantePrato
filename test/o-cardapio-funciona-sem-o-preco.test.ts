import { describe, expect, it } from "vitest";

import {
  WEEKDAYS,
  formatBRL,
  isWeekday,
  precoDaMassa,
  precoDoBuffet,
} from "@/config/menu";

/**
 * O cardápio precisa existir antes dos preços chegarem.
 *
 * O cliente confirmou o modelo — buffet por quilo, ilha de massas com valor
 * próprio — e não passou os números. Inventar um valor plausível aqui seria o
 * mesmo erro que o `AGENTS.md` proíbe em razão social e CNPJ, com uma agravante:
 * um preço errado numa mesa é uma discussão no caixa.
 *
 * Então o preço é opcional por construção, no mesmo padrão que este projeto já
 * usa para o telefone (`contact.phone`), o WhatsApp (`whatsappLink()`) e o
 * horário (`openingHoursLabel()`): sem valor configurado, o rótulo devolve
 * `null` e quem chama some com o aviso inteiro — em vez de mostrar "R$ 0,00" ou
 * um rótulo seguido de vazio.
 *
 * Quando os dois números chegarem, é uma linha de configuração cada.
 */
/**
 * ⚠️ O `Intl` separa o cifrão do número com um espaço NÃO SEPARÁVEL (U+00A0),
 * não com o espaço comum. As duas strings são indistinguíveis a olho nu, e a
 * primeira versão destes testes falhou com "expected 'R$ 7,00' to be 'R$ 7,00'".
 *
 * Ele fica explícito aqui de propósito, em vez de os dois lados serem
 * normalizados: o caractere é o certo — é ele que impede o navegador de quebrar
 * a linha entre "R$" e o valor — e uma comparação normalizada deixaria passar a
 * troca dele por um espaço comum.
 */
const NBSP = "\u00a0";

describe("os preços do cardápio", () => {
  it("devolvem null enquanto não forem configurados", () => {
    // O estado de HOJE. Se este teste começar a falhar, é porque alguém pôs um
    // número — e aí os dois abaixo é que passam a valer.
    expect(precoDoBuffet()).toBeNull();
    expect(precoDaMassa()).toBeNull();
  });

  it("formatam em real brasileiro quando existem", () => {
    expect(precoDoBuffet(105.9)).toBe(`R$${NBSP}105,90/kg`);
    expect(precoDaMassa(41.9)).toBe(`R$${NBSP}41,90`);
  });

  it("o buffet leva o sufixo por quilo, e a massa não", () => {
    // São duas contas diferentes: o buffet é pelo peso do prato montado, a
    // massa tem valor fechado. Misturar os dois formatos é exatamente o
    // mal-entendido que o cardápio existe para evitar.
    expect(precoDoBuffet(50)).toMatch(/\/kg$/);
    expect(precoDaMassa(50)).not.toMatch(/\/kg$/);
  });

  it("nunca mostram zero como se fosse preço", () => {
    // `0` é falso em JavaScript, e um preço de zero é dado ausente, não
    // promoção. O caminho tem que ser o mesmo do não configurado.
    expect(precoDoBuffet(0)).toBeNull();
    expect(precoDaMassa(0)).toBeNull();
  });

  it("formatam com vírgula decimal e cifrão, como se lê no Brasil", () => {
    expect(formatBRL(7)).toBe(`R$${NBSP}7,00`);
    expect(formatBRL(1234.5)).toBe(`R$${NBSP}1.234,50`);
  });
});

describe("os dias do cardápio", () => {
  /*
   * ⚠️ Não há mais teste de slug de dia. Os ajudantes de link direto
   * (`/cardapio?dia=terca`) vieram junto quando a configuração foi trazida do
   * projeto irmão e ficaram sem consumidor nenhum — nem lá nem aqui. Saíram em
   * 31/08, e os testes deles com eles: teste de código que não existe mais dá
   * a impressão de cobertura que não há.
   */
  it("são de segunda a sexta, porque a casa não abre no fim de semana", () => {
    expect([...WEEKDAYS]).toEqual([1, 2, 3, 4, 5]);
  });

  it("recusa dia que a casa nunca vai servir", () => {
    // O banco tipa `weekdays` como `number[]` — nada impede um 6 de entrar por
    // um script. Este é o ponto onde ele para.
    expect(isWeekday(1)).toBe(true);
    expect(isWeekday(5)).toBe(true);
    expect(isWeekday(0)).toBe(false);
    expect(isWeekday(6)).toBe(false);
    expect(isWeekday(7)).toBe(false);
  });
});
