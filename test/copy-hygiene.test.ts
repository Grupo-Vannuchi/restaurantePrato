import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const catalog = readFileSync(
  join(process.cwd(), "src/messages/pt.json"),
  "utf8",
);

const TEXT_EXT = new Set([".ts", ".tsx", ".json", ".css", ".mjs", ".md", ".txt"]);

/** Arquivos de texto sob um caminho, que pode ser arquivo ou pasta. */
function walk(target: string): string[] {
  const full = join(process.cwd(), target);
  if (statSync(full).isFile()) {
    return TEXT_EXT.has(extname(full)) ? [full] : [];
  }
  return readdirSync(full).flatMap((entry) => walk(join(target, entry)));
}

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

  it("não descreve a casa como cafeteria", () => {
    // Decisão de 19/08: o Prato é restaurante de almoço — buffet e churrasco
    // na brasa. A razão social registrada diz "COFFEE SHOP", e por isso o
    // termo proibido aqui é "cafeteria", não "coffee": `legalName` e o e-mail
    // `pratocoffee@` são registro, e ficam.
    const targets = ["src", "README.md", "AGENTS.md", "CLAUDE.md", "SECURITY.md"];
    const offenders = targets
      .flatMap((target) => walk(target))
      .filter((file) => /cafeteria/i.test(readFileSync(file, "utf8")))
      .map((file) => file.replace(process.cwd(), ""));
    expect(offenders).toEqual([]);
  });
});
