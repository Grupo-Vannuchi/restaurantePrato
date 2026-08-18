import { describe, expect, it } from "vitest";
import { phoneLink, siteConfig, type SiteConfig } from "@/config/site";

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
