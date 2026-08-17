import { describe, expect, it } from "vitest";
import { phoneLink, siteConfig } from "@/config/site";

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
