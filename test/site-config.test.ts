import { describe, expect, it } from "vitest";
import {
  openingHoursLabel,
  phoneLink,
  siteConfig,
  type SiteConfig,
} from "@/config/site";

describe("phoneLink", () => {
  it("devolve null quando não há telefone configurado", () => {
    // O Prato não tem telefone fixo: o site precisa omitir os CTAs de ligar
    // em vez de gerar um `tel:` vazio.
    if (siteConfig.contact.phone) {
      expect(phoneLink()).toBe(
        `tel:${siteConfig.contact.phone.replace(/[^\d+]/g, "")}`,
      );
    } else {
      expect(phoneLink()).toBeNull();
    }
  });
});

describe("horário de funcionamento", () => {
  it("o tipo aceita um restaurante sem horário conhecido", () => {
    // Enquanto o horário do Prato não chega, a config precisa poder omiti-lo —
    // exibir o horário herdado mandaria o visitante para a porta fechada.
    const semHorario: SiteConfig = { ...siteConfig, openingHours: undefined };
    expect(semHorario.openingHours).toBeUndefined();
  });
});

describe("openingHoursLabel", () => {
  it("devolve null quando não há dias configurados", () => {
    // Não dá para testar isto com `openingHoursLabel(undefined)`: em JS, um
    // argumento explicitamente `undefined` cai no mesmo valor default que a
    // chamada sem argumento — ou seja, no horário real do `siteConfig`, que
    // esta mesma task acabou de publicar. Para exercitar o branch "sem
    // horário" é preciso um `OpeningHours` explícito sem dias.
    expect(
      openingHoursLabel({ days: [], opens: "11:00", closes: "15:00" }),
    ).toBeNull();
  });

  it("resume um intervalo contíguo de dias", () => {
    expect(
      openingHoursLabel({
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "11:00",
        closes: "15:00",
      }),
    ).toBe("Seg a sex, das 11h às 15h");
  });

  it("nomeia um único dia sem inventar intervalo", () => {
    expect(
      openingHoursLabel({
        days: ["Saturday"],
        opens: "11:00",
        closes: "15:00",
      }),
    ).toBe("Sáb, das 11h às 15h");
  });

  it("lista dias não contíguos em vez de fingir que são um intervalo", () => {
    expect(
      openingHoursLabel({
        days: ["Monday", "Wednesday", "Friday"],
        opens: "11:00",
        closes: "15:00",
      }),
    ).toBe("Seg, qua, sex, das 11h às 15h");
  });

  it("preserva os minutos quando o horário não fecha na hora cheia", () => {
    expect(
      openingHoursLabel({
        days: ["Monday"],
        opens: "11:30",
        closes: "15:45",
      }),
    ).toBe("Seg, das 11h30 às 15h45");
  });

  it("nunca publica horário sem dizer em que dias", () => {
    // Esta é a regressão que a task existe para impedir: uma linha que diz
    // "das 11h às 15h" e nada mais afirma, para quem lê, que o restaurante
    // abre todo dia — e manda a pessoa para a porta fechada no sábado.
    const label = openingHoursLabel();
    if (label !== null) {
      expect(label).toMatch(/seg|ter|qua|qui|sex|sáb|dom/i);
    }
  });
});
