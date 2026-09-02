import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guarda de regressão do rebrand Fogão de Ouro → Restaurante Prato.
 *
 * Este repositório é um fork do site pronto do Fogão de Ouro, e a copy herdada
 * afirmava fatos daquele restaurante sem citar a marca ("180 lugares", "Bolsa
 * do Café"). Um grep pelo nome da marca não pega isso — daí a lista abaixo.
 *
 * ⚠️ **A cobrança por quilo SAIU da lista em 31/08, e a saída é a exceção que
 * confirma a regra.** Ela entrou aqui porque era um fato do Fogão de Ouro que a
 * copy herdada afirmava sem provar. Nesta data o dono do projeto confirmou que
 * o Prato também cobra o buffet por peso — então deixou de ser vestígio e virou
 * dado do cliente, registrado em `docs/WHITELABEL-RESTAURANTE-PRATO.md`.
 *
 * O que NÃO mudou: nenhum outro item sai daqui sem confirmação explícita, e
 * "Centro Histórico" continua bloqueado justamente por ser o caso ainda em
 * aberto. Tirar um item desta lista porque ele atrapalhou uma tarefa é o
 * caminho pelo qual o dado do cliente anterior volta.
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
  "Centro Histórico",
  "180 lugares",
  "1.200 avaliações",
  "11010-090",
  "3219-1552",
  "99163-2985",
  "04.160.109",
];

const TEXT_EXT = new Set([".ts", ".tsx", ".json", ".css", ".mjs", ".md", ".txt"]);

/**
 * Um alvo citado nome a nome na lista: arquivo entra sempre, pasta é varrida.
 *
 * A extensão só filtra o que a varredura acha sozinha dentro de uma pasta.
 * Enquanto ela filtrava também os alvos explícitos, `.env.example` ficava de
 * fora — para o `extname` a extensão dele é `.example` — e o cabeçalho do
 * template atravessou o rebrand ainda dizendo o nome do cliente anterior.
 */
function walk(target: string): string[] {
  const full = join(process.cwd(), target);
  return statSync(full).isFile() ? [full] : walkInside(target);
}

/** Arquivos de texto dentro de uma pasta, recursivamente. */
function walkInside(target: string): string[] {
  const full = join(process.cwd(), target);
  if (statSync(full).isFile()) {
    return TEXT_EXT.has(extname(full)) ? [full] : [];
  }
  return readdirSync(full).flatMap((entry) => walkInside(join(target, entry)));
}

/** `caminho: termo` para cada vestígio encontrado. */
function offenders(targets: string[]): string[] {
  return targets.flatMap((target) => walk(target)).flatMap((file) => {
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

  it("nos documentos de instrução na raiz do repositório", () => {
    expect(
      offenders(["AGENTS.md", "CLAUDE.md", "README.md", "SECURITY.md"]),
    ).toEqual([]);
  });

  it("nos arquivos de configuração da raiz", () => {
    expect(
      offenders([
        ".env.example",
        "docker-compose.yml",
        "vercel.json",
        "package.json",
        "prisma.config.ts",
      ]),
    ).toEqual([]);
  });

  it("em varredura completa do código e dos assets", () => {
    expect(offenders(["src", "public", "prisma"])).toEqual([]);
  });
});
