import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";

/**
 * O ponto de referência que o cliente mandou chega às páginas.
 *
 * ⚠️ **Ele ficou parado quase um dia inteiro, e é esse o defeito que esta
 * guarda pega.** O cliente confirmou em 17/09/2026 — "próximo à Praça Mauá, na
 * região dos fundos da Prefeitura de Santos (Palácio José Bonifácio)" — e a
 * reauditoria de SEO de 18/09 encontrou o dado em lugar nenhum do site. Não foi
 * decisão: foi um dado confirmado que ninguém aplicou, que é a falha mais cara
 * deste projeto porque termina com o cliente sendo perguntado duas vezes.
 *
 * É busca local de verdade: quem procura "almoço perto da Praça Mauá" só
 * encontra a casa se a casa disser que está lá.
 *
 * ⚠️ **E o que NÃO entrou importa igual:** o documento do cliente dizia "Centro
 * Histórico", termo que é fato do cliente ANTERIOR ainda em aberto e que
 * `test/brand-hygiene.test.ts` bloqueia. Herdá-lo junto com o resto da frase
 * seria exatamente o que aquela guarda existe para impedir.
 */
const pagina = (nome: string) =>
  readFileSync(
    join(process.cwd(), "src", "app", "[locale]", "(marketing)", nome, "page.tsx"),
    "utf8",
  );

describe("o ponto de referência", () => {
  it("está configurado, e cita os dois marcos que o cliente deu", () => {
    const landmark = siteConfig.contact.address.landmark;
    expect(landmark, "referência não configurada").toBeTruthy();
    expect(landmark).toMatch(/Pra[çc]a Mau[áa]/i);
    expect(landmark).toMatch(/Jos[ée] Bonif[áa]cio/i);
  });

  it("não traz o termo bloqueado do cliente anterior", () => {
    // A metade que o documento do cliente trazia e que não podia vir junto.
    expect(siteConfig.contact.address.landmark).not.toMatch(/Centro Hist[óo]rico/i);
  });

  it.each(["contato", "reservas"])("é renderizado em /%s", (rota) => {
    // Configurar sem renderizar é o mesmo que não ter: a guarda cobra o
    // consumo, não a existência do campo.
    expect(pagina(rota)).toMatch(/address\.landmark/);
  });

  it("some sozinho se a referência for removida — o campo é opcional", () => {
    // O contrato de todo dado de cliente neste projeto: sem valor, a linha não
    // sai vazia; ela não sai. Em `/contato` isso é um espalhamento condicional.
    expect(pagina("contato")).toMatch(/\.\.\.\(contact\.address\.landmark/);
  });
});
