import { describe, expect, it } from "vitest";

import { serializarJsonLd } from "@/components/json-ld";

/**
 * Fuga da tag `<script>` no JSON-LD.
 *
 * O bloco de dados estruturados é injetado com `dangerouslySetInnerHTML`, e
 * `JSON.stringify` **não escapa `<`** — não é função dele. Basta um `</script>`
 * dentro de qualquer texto para a tag fechar ali, e o que vier depois é HTML
 * que o navegador executa.
 *
 * Por muito tempo isso foi inofensivo aqui, e o comentário no componente dizia
 * que os dados vinham "de configuração estática, não de entrada de usuário".
 * Deixou de ser verdade quando as novidades passaram a alimentar o schema
 * `Article`: `title` e `description` são digitados no painel.
 *
 * Quem escreve precisa estar autenticado, então não é XSS aberto ao público —
 * é escalada: uma sessão de admin comprometida, ou um texto colado sem
 * conferir, vira execução de script em toda visita à página. E a CSP atual não
 * segura, porque `script-src` ainda carrega `'unsafe-inline'`.
 */
const HOSTIL = '</script><script>alert(document.cookie)</script>';

describe("serialização do JSON-LD", () => {
  it("não deixa uma tag de script fechar no meio do conteúdo", () => {
    const saida = serializarJsonLd({ headline: HOSTIL });
    expect(saida).not.toContain("</script");
    expect(saida).not.toContain("<script");
  });

  it("continua sendo JSON válido, com o texto intacto", () => {
    // Escapar não pode corromper o dado: o Google precisa ler o mesmo texto que
    // a página mostra, senão o dado estruturado mente sobre a página.
    const saida = serializarJsonLd({ headline: HOSTIL });
    expect(JSON.parse(saida)).toEqual({ headline: HOSTIL });
  });

  it("preserva acento e emoji", () => {
    const dados = { name: "Almoço · Restaurante Prato", nota: "★" };
    expect(JSON.parse(serializarJsonLd(dados))).toEqual(dados);
  });

  it("escapa todo `<`, não só o da tag", () => {
    const saida = serializarJsonLd({ texto: "menor < maior" });
    expect(saida).not.toContain("<");
    expect(JSON.parse(saida).texto).toBe("menor < maior");
  });
});
