import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";

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

/**
 * O que os documentos afirmam sobre a MARCA também tem que ser verdade.
 *
 * Em 26/08 o cliente entregou as cores e o site passou a ter uma paleta só. Os
 * dois documentos de instrução continuaram dizendo que a paleta era herdada do
 * fork, que as cores do Prato "não chegaram ainda" e que o site é dark-first.
 *
 * É o mesmo problema do React Compiler, corrigido no dia anterior: afirmação
 * que envelheceu num arquivo que ninguém releia. E a consequência é pior aqui,
 * porque a frase pede explicitamente para NÃO mexer ("está aí só para o site
 * continuar renderizando") — o que travaria quem chegasse depois.
 *
 * A guarda amarra a afirmação a um fato verificável, e não à data: os hexes que
 * o fork trouxe são conhecidos, e a paleta ou é um deles ou não é.
 */
const WHITELABEL = readFileSync(
  join(process.cwd(), "docs", "WHITELABEL-RESTAURANTE-PRATO.md"),
  "utf8",
);

/** Hexes da marca que vieram do projeto do qual este repo é fork. */
const HERDADOS = ["#8A5206", "#E68A08"];

describe("os documentos e a marca concordam", () => {
  it("sobre a paleta ser herdada do fork ou ser a do cliente", () => {
    const herdada = HERDADOS.some(
      (hex) => siteConfig.theme.brand.toUpperCase() === hex.toUpperCase(),
    );
    const documentosAfirmamHerdada =
      /palette in `site\.ts` is inherited/i.test(AGENTS) ||
      /tema em `site\.ts` ainda é o herdado/i.test(WHITELABEL);

    expect(documentosAfirmamHerdada).toBe(herdada);
  });

  it("sobre o site ter tema escuro", () => {
    // `Dark-first` só é verdade se existir uma variante escura para ser a
    // primeira. A paleta virou uma só em 26/08.
    const temVarianteEscura = Object.prototype.hasOwnProperty.call(
      siteConfig.theme,
      "dark",
    );
    const documentoAfirmaDarkFirst = /\*\*Dark-first\.\*\*/.test(AGENTS);

    expect(documentoAfirmaDarkFirst).toBe(temVarianteEscura);
  });

  it("continua havendo o que conferir — senão a guarda não guarda", () => {
    expect(AGENTS).toMatch(/## Brand & theme/);
    expect(WHITELABEL).toMatch(/Pendência/);
  });
});
