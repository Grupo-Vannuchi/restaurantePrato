import { describe, expect, it } from "vitest";

import {
  WEEKDAYS,
  formatBRL,
  isWeekday,
  pastaExtras,
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
  /**
   * ⚠️ **Os preços chegaram em 17/09/2026, e este teste mudou de lado — é o que
   * o anterior mandava fazer.**
   *
   * Havia aqui uma asserção de que os dois ajudantes devolviam `null`, com o
   * comentário: "O estado de HOJE. Se este teste começar a falhar, é porque
   * alguém pôs um número — e aí os dois abaixo é que passam a valer." Foi o que
   * aconteceu: o cliente passou R$ 94,99 o quilo e R$ 41,90 a porção de massa.
   *
   * O valor fica cobrado aqui, e não só na configuração, porque preço é dado de
   * cliente: um dedo errado em `menu.ts` vira discussão no caixa, e o número
   * escrito em dois lugares que precisam concordar é o que transforma isso em
   * teste vermelho em vez de reclamação de cliente.
   */
  it("saem configurados com os valores que o cliente passou", () => {
    expect(precoDoBuffet()).toBe(`R$${NBSP}94,99/kg`);
    expect(precoDaMassa()).toBe(`R$${NBSP}41,90`);
  });

  it("continuam degradando com qualquer valor falso", () => {
    /*
     * ⚠️ **`precoDoBuffet(undefined)` NÃO exercita o caminho do ausente, e a
     * primeira versão deste teste caiu nessa.** Passar `undefined` a um
     * parâmetro com valor padrão ACIONA o padrão — os ajudantes são
     * `valor = menuPricing.buffetPerKg` —, então a chamada devolveu
     * "R$ 94,99/kg" e o teste falhou afirmando o contrário do que queria.
     *
     * Ou seja: com o preço configurado, o cenário "configuração vazia" não é
     * alcançável por argumento, só trocando o módulo. O que É cobrável, e é o
     * contrato de verdade da função, é `if (!valor) return null` — qualquer
     * valor falso cai no mesmo caminho. `0` já é cobrado logo abaixo por ser o
     * caso perigoso (preço de zero anuncia buffet de graça); `NaN` entra aqui
     * porque é o que um parse ruim produz.
     *
     * A degradação de PONTA — o aviso inteiro sumir da tela — é guardada em
     * `e2e/`, contra o que a página realmente renderiza, e não aqui.
     */
    expect(precoDoBuffet(Number.NaN)).toBeNull();
    expect(precoDaMassa(Number.NaN)).toBeNull();
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

describe("os adicionais da ilha de massas", () => {
  /**
   * ⚠️ **Eles estavam FORA do cardápio, não sem preço — e a diferença é a
   * razão de existirem só agora.**
   *
   * `pastaExtras` era uma lista vazia de propósito: o adicional é a exceção à
   * regra de que o preço é da seção, então uma linha "Filé de frango" solta no
   * meio do cardápio lê como INCLUSA, e a pessoa descobre o contrário na conta.
   * O componente some com a seção inteira quando a lista está vazia.
   *
   * Os dois valores chegaram em 17/09/2026: filé de frango R$ 7,50 e bife de
   * alcatra R$ 8,50. Os gramas já estavam confirmados desde 03/09, com a
   * composição da ilha.
   */
  it("são os dois que o cliente confirmou, com peso e preço", () => {
    expect(pastaExtras.map((e) => [e.name, e.weight, e.price])).toEqual([
      ["Filé de frango", "110 gramas", 7.5],
      ["Bife de alcatra", "120 gramas", 8.5],
    ]);
  });

  it("nenhum entra sem preço, que é o que fazia a lista ficar vazia", () => {
    // Sentinela: uma lista vazia passaria as duas asserções acima de forma
    // vácua se a primeira mudasse de forma, e um adicional com preço 0 ou
    // ausente é exatamente o caso que a seção existia para não publicar.
    expect(pastaExtras.length).toBe(2);
    for (const extra of pastaExtras) {
      expect(extra.price).toBeGreaterThan(0);
      expect(extra.weight).toMatch(/\d+ gramas/);
    }
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
