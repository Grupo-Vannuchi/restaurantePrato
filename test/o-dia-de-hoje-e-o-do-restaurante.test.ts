import { afterEach, describe, expect, it, vi } from "vitest";

import { weekdayNoRestaurante } from "@/lib/dates";

/**
 * O cardápio abre no dia certo, e "certo" é o dia em Santos.
 *
 * ⚠️ `new Date().getDay()` devolve o dia no fuso de quem executa — na Vercel,
 * UTC. Santos é UTC−3, então das 21h à meia-noite o servidor já virou o dia e o
 * restaurante não: quem entrasse às 21h30 de uma terça veria o cardápio abrir na
 * quarta.
 *
 * É o mesmo defeito que a data do lead teve em 21/08, na mesma janela de três
 * horas, e que passou despercebido porque a máquina de desenvolvimento está no
 * fuso de São Paulo — onde o resultado sai certo por coincidência.
 */
afterEach(() => {
  vi.useRealTimers();
});

/** Congela o relógio num instante UTC exato. */
function em(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe("o dia da semana do restaurante", () => {
  it("é o dia em Santos, não o do servidor, na janela em que os dois discordam", () => {
    // Terça 01/09, 21h30 em Santos = 00h30 de QUARTA em UTC: o servidor já
    // virou o dia e o restaurante não.
    em("2026-09-02T00:30:00Z");
    expect(weekdayNoRestaurante()).toBe(2); // terça
  });

  it("vira o dia junto com o restaurante, e não três horas antes", () => {
    // 23h59 de terça em Santos ainda é terça.
    em("2026-09-02T02:59:00Z");
    expect(weekdayNoRestaurante()).toBe(2);
    // 00h01 de quarta em Santos já é quarta.
    em("2026-09-02T03:01:00Z");
    expect(weekdayNoRestaurante()).toBe(3);
  });

  it("numera a semana começando na segunda", () => {
    em("2026-08-31T15:00:00Z"); // segunda, meio da tarde em Santos
    expect(weekdayNoRestaurante()).toBe(1);
  });

  it("devolve 6 e 7 no fim de semana, que não são dias de cardápio", () => {
    // Quem chama decide o que fazer com isso — as abas caem na segunda.
    em("2026-09-05T15:00:00Z"); // sábado
    expect(weekdayNoRestaurante()).toBe(6);
    em("2026-09-06T15:00:00Z"); // domingo
    expect(weekdayNoRestaurante()).toBe(7);
  });
});
