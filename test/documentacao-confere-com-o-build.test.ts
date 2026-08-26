import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * O que o AGENTS.md afirma sobre o build tem que ser verdade no build.
 *
 * O documento dizia "React Compiler is on" e ele **não está**: não aparece em
 * `next.config.ts`, o plugin não está instalado, e o build não o registra. A
 * afirmação atravessou sete planos e chegou a um comentário de código escrito
 * em 25/08, que justificava uma decisão com uma premissa falsa.
 *
 * Premissa errada num documento de instrução é pior que ausência de documento:
 * ela orienta decisões, e ninguém a questiona porque está escrita.
 *
 * Esta guarda é estreita de propósito — cobre uma afirmação, a que já falhou.
 * Não é uma tentativa de validar o documento inteiro; é o mesmo princípio do
 * `trava-de-lancamento`: o aviso que só existe em prosa não impede nada.
 */
const AGENTS = readFileSync(join(process.cwd(), "AGENTS.md"), "utf8");
const CONFIG = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
const PACOTE = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

/** O compilador está de fato ligado? Três sinais, todos precisam concordar. */
function compiladorLigado(): boolean {
  const naConfig = /reactCompiler\s*:\s*true/.test(CONFIG);
  const instalado = Object.keys({
    ...PACOTE.dependencies,
    ...PACOTE.devDependencies,
  }).some((n) => n.includes("react-compiler"));
  return naConfig && instalado;
}

describe("o AGENTS.md e o build concordam", () => {
  it("sobre o React Compiler estar ligado ou não", () => {
    const documentoAfirmaQueSim = /React Compiler is on/i.test(AGENTS);

    expect(documentoAfirmaQueSim).toBe(compiladorLigado());
  });

  it("continua havendo o que conferir — senão a guarda não guarda", () => {
    expect(AGENTS).toMatch(/React Compiler/);
  });
});
