import { describe, expect, it } from "vitest";

import { ehLinkSeguro } from "@/lib/safe-link";

/**
 * Esquemas de link aceitos no texto das novidades.
 *
 * O `RichText` renderiza `[rótulo](destino)` como link, e o destino vinha do
 * painel direto para o `href`. Um `href` que começa com `javascript:` executa
 * código no clique — não precisa de tag `<script>` nenhuma, e nenhum escape de
 * texto impede, porque o problema não é o texto: é o destino.
 *
 * Mesma família do defeito do JSON-LD, e mesmo modelo de ameaça: quem escreve
 * precisa estar autenticado. Vale corrigir pela mesma razão — sessão de admin
 * comprometida, ou texto colado de fora sem conferir, não deveria virar
 * execução de código no site do cliente.
 *
 * A lista é de permissão, não de proibição: esquema novo que ninguém previu
 * chega barrado, e não liberado.
 */
describe("destino de link no texto das novidades", () => {
  it("aceita o que um restaurante de fato usa", () => {
    expect(ehLinkSeguro("https://instagram.com/restaurante.prato")).toBe(true);
    expect(ehLinkSeguro("http://exemplo.com.br")).toBe(true);
    expect(ehLinkSeguro("mailto:pratocoffee@gmail.com")).toBe(true);
    expect(ehLinkSeguro("tel:+5513978208568")).toBe(true);
    expect(ehLinkSeguro("https://wa.me/5513978208568")).toBe(true);
  });

  it("barra os esquemas que executam código", () => {
    expect(ehLinkSeguro("javascript:alert(document.cookie)")).toBe(false);
    // Maiúsculas e espaço em branco no começo são o disfarce mais antigo que
    // existe para passar por uma verificação ingênua.
    expect(ehLinkSeguro("JavaScript:alert(1)")).toBe(false);
    expect(ehLinkSeguro("  javascript:alert(1)")).toBe(false);
    expect(ehLinkSeguro("java\tscript:alert(1)")).toBe(false);
    expect(ehLinkSeguro("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(ehLinkSeguro("vbscript:msgbox(1)")).toBe(false);
  });

  it("barra o que não tem esquema reconhecível", () => {
    expect(ehLinkSeguro("")).toBe(false);
    expect(ehLinkSeguro("nao-e-um-link")).toBe(false);
  });
});
