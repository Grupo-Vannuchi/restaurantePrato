import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const catalog = readFileSync(
  join(process.cwd(), "src/messages/pt.json"),
  "utf8",
);

describe("higiene da copy", () => {
  it("não usa emoji em nenhuma string do catálogo", () => {
    // Decisão de 19/08 (§3.5 do spec): o guia de tom de voz do cliente
    // recomenda emoji, mas o site do qual este repo é fork nunca usou, e o
    // catálogo inteiro é lido por metadata, `llms.txt` e imagem OG — onde
    // emoji vira ruído no resultado de busca. O único emoji legítimo do
    // projeto está em `src/lib/lead-notify.ts`, que é mensagem operacional
    // enviada AO restaurante, não copy do site.
    const found = [...catalog.matchAll(/\p{Extended_Pictographic}/gu)].map(
      (m) => m[0],
    );
    expect(found).toEqual([]);
  });
});
