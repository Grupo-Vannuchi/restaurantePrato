import { describe, expect, it } from "vitest";

import { reviewLink, siteConfig } from "@/config/site";

/**
 * O convite para avaliar no Google só existe quando há para onde mandar.
 *
 * O restaurante ainda não passou o link da própria página no Google. Enquanto
 * não passar, o botão "Deixe sua avaliação aqui" não pode aparecer em lugar
 * nenhum — um botão que leva a `undefined` é pior que botão nenhum: quem clica
 * cai numa página de erro e conclui que o site está quebrado.
 *
 * É o mesmo contrato de `whatsappLink()` e de `telLink()`, que já vivem neste
 * arquivo pelo mesmo motivo: dado de cliente que ainda não chegou vira `null`,
 * e cada chamador trata o `null` fazendo o elemento sumir. Foi assim que os
 * botões de ligar sumiram sozinhos quando ficou claro que o Prato não tem
 * telefone fixo.
 *
 * ⚠️ **O caminho COM link é testado hoje, e é esse o ponto de o ajudante
 * receber a URL por parâmetro.** Lendo `siteConfig` direto, este teste só
 * conseguiria exercitar o estado atual — sem link — e o dia da estreia do botão
 * seria o dia em que ninguém nunca o viu funcionar. Mesma decisão do
 * `PriceCallout`, do `PastaBuilder` e do `WineList`.
 */
describe("o link de avaliação", () => {
  it("é null enquanto o cliente não passa a página do Google", () => {
    // O estado de hoje, lido da configuração de verdade.
    expect(siteConfig.reviewUrl).toBeUndefined();
    expect(reviewLink()).toBeNull();
  });

  it("devolve a URL quando ela existir", () => {
    // O caminho que ainda não existe em produção.
    expect(reviewLink("https://share.google/abc123")).toBe("https://share.google/abc123");
  });

  it("trata cadeia vazia como ausência, e não como link", () => {
    /*
     * Um campo preenchido com "" é o modo mais provável de alguém "configurar"
     * o link sem configurar nada — colar por engano, ou limpar o valor no
     * painel. Sem esta linha, `""` seria falsy no ajudante mas passaria por
     * qualquer checagem que use `!== undefined`, e o botão apareceria levando a
     * lugar nenhum.
     */
    expect(reviewLink("")).toBeNull();
    expect(reviewLink("   ")).toBeNull();
  });

  it("recusa o que não é endereço da web", () => {
    // Um `javascript:` num campo que vira `href` é execução de código na página.
    // O valor vem de configuração, não de formulário, mas o campo existe para
    // ser editado por quem não escreve código.
    expect(reviewLink("javascript:alert(1)")).toBeNull();
    expect(reviewLink("g.page/restaurante")).toBeNull(); // sem esquema
  });
});
