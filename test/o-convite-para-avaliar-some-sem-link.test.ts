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

  /**
   * ⚠️ **A URL COLADA DA BARRA DE ENDEREÇOS, que é o que de fato chega.**
   *
   * Em 17/09/2026 o link entregue para este campo foi
   * `https://www.google.com/search?q=restaurante+prato+avaliações&…` — a página
   * de RESULTADO DE BUSCA, copiada do navegador. Ela passava em todas as
   * checagens acima: é absoluta, é `https`, não é vazia.
   *
   * Dois danos, e o segundo é o que obriga a guarda:
   *
   * 1. **Não é a ficha do restaurante.** É uma busca por "restaurante prato
   *    avaliações", que devolve resultado genérico — inclusive de outras casas
   *    com "Prato" no nome. O convite "Deixe sua avaliação" levaria a uma lista.
   *
   * 2. **Publica a sessão de navegação de quem copiou.** O link trazia
   *    `biw=1366&bih=633` (o tamanho da janela), `sxsrf` com carimbo de tempo
   *    daquele minuto, `ei` e `sca_esv` (ids de sessão e de experimento),
   *    `gs_lp` (telemetria de como a consulta foi digitada) e 300 caracteres de
   *    payload no fragmento. `reviewLink()` é consumido pelo RODAPÉ, então isso
   *    iria para o HTML público de toda página do cliente.
   *
   * O que serve é o link da ficha, que o painel do Google Business Profile
   * entrega pronto: `https://g.page/r/<id>/review` ou
   * `https://search.google.com/local/writereview?placeid=<id>`.
   */
  it("recusa página de busca do Google, que não é a ficha do restaurante", () => {
    expect(reviewLink("https://www.google.com/search?q=restaurante+prato")).toBeNull();
    expect(reviewLink("https://www.google.com/search")).toBeNull();
  });

  it("recusa URL com parâmetro de sessão do navegador", () => {
    // Cada um destes só existe em endereço copiado da barra. Basta um.
    for (const sujeira of ["sxsrf", "ei", "biw", "bih", "gs_lp", "sca_esv", "sclient"]) {
      expect(
        reviewLink(`https://g.page/r/ABC/review?${sujeira}=x`),
        `${sujeira} deveria invalidar o link`,
      ).toBeNull();
    }
  });

  it("aceita as formas que o Google entrega de verdade", () => {
    // Sentinela do par acima: se a recusa ficar larga demais, ela come o link
    // bom e o convite nunca aparece — falha silenciosa, que é a pior das duas.
    for (const bom of [
      "https://g.page/r/CQz1aBcDeFgH/review",
      "https://search.google.com/local/writereview?placeid=ChIJ0123456789",
      "https://maps.app.goo.gl/AbCdEfGhIjK",
      "https://share.google/abc123",
    ]) {
      expect(reviewLink(bom), `${bom} deveria ser aceito`).toBe(bom);
    }
  });

  it("o que estiver NA CONFIGURAÇÃO tem de sobreviver ao ajudante", () => {
    /*
     * A guarda que pega o erro de verdade. As de cima provam o comportamento do
     * ajudante; esta olha o valor real do projeto, e é ela que fica vermelha no
     * dia em que alguém colar a URL da barra de endereços em `siteConfig`.
     *
     * Escrita como uma asserção só, e não com `if (...) return`, porque teste
     * que se pula sozinho passa vazio justamente no caso que importa.
     */
    expect(
      siteConfig.reviewUrl === undefined || reviewLink() !== null,
      "`reviewUrl` está preenchido com um valor que `reviewLink()` recusa — " +
        "provavelmente uma URL copiada da barra de endereços do Google (página " +
        "de busca, ou com parâmetros de sessão como sxsrf/ei/biw). Cole o link " +
        "da ficha, que o Google Business Profile entrega pronto: " +
        "https://g.page/r/<id>/review ou " +
        "https://search.google.com/local/writereview?placeid=<id>.",
    ).toBe(true);
  });
});
