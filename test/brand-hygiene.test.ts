import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guarda de regressão do rebrand Fogão de Ouro → Restaurante Prato.
 *
 * Este repositório é um fork do site pronto do Fogão de Ouro, e a copy herdada
 * afirmava fatos daquele restaurante sem citar a marca ("180 lugares", "por
 * quilo", "Bolsa do Café"). Um grep pelo nome da marca não pega isso — daí a
 * lista abaixo.
 *
 * `docs/` NÃO é varrido de propósito: os specs e planos do rebrand anterior
 * ficam no repo justamente por explicarem por que o código tem a forma que tem,
 * e este spec cita a marca antiga em cada seção.
 */
const FORBIDDEN = [
  "Fogão de Ouro",
  "Fogao de Ouro",
  "fogaodeouro",
  "fgdeouro",
  "Frei Gaspar",
  "Bolsa do Café",
  "Museu do Café",
  "180 lugares",
  "1.200 avaliações",
  "por quilo",
  "por Quilo",
  "11010-090",
  "3219-1552",
  "99163-2985",
  "04.160.109",
];

const TEXT_EXT = new Set([".ts", ".tsx", ".json", ".css", ".mjs", ".md", ".txt"]);

/** Todos os arquivos de texto sob um caminho, que pode ser arquivo ou pasta. */
function walk(target: string): string[] {
  const full = join(process.cwd(), target);
  if (statSync(full).isFile()) {
    return TEXT_EXT.has(extname(full)) ? [full] : [];
  }
  return readdirSync(full).flatMap((entry) => walk(join(target, entry)));
}

/** `caminho: termo` para cada vestígio encontrado. */
function offenders(targets: string[]): string[] {
  return targets.flatMap(walk).flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return FORBIDDEN.filter((term) => text.includes(term)).map(
      (term) => `${file.replace(process.cwd(), "")}: ${term}`,
    );
  });
}

describe("nenhum vestígio do cliente anterior", () => {
  it("na configuração de marca e nos documentos legais", () => {
    expect(offenders(["src/config", "src/content", "src/i18n"])).toEqual([]);
  });

  it("nos componentes e rotas que desenham a marca", () => {
    expect(
      offenders([
        "src/components/layout/logo.tsx",
        "src/app/icon.tsx",
        "src/app/apple-icon.tsx",
        "src/app/[locale]/opengraph-image.tsx",
        "src/app/globals.css",
        "public",
      ]),
    ).toEqual([]);
  });

  it("no catálogo de mensagens e nas rotas de texto", () => {
    expect(
      offenders([
        "src/messages",
        "src/app/llms.txt",
        "src/app/llms-full.txt",
        "src/app/manifest.ts",
        "src/lib",
      ]),
    ).toEqual([]);
  });
});
