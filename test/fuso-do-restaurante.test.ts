import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { restaurantDateFormat } from "@/lib/dates";

/**
 * Data mostrada a uma pessoa sai no fuso do restaurante, nunca no do servidor.
 *
 * `new Intl.DateTimeFormat(locale, { dateStyle: "medium" })` — sem `timeZone` —
 * formata no fuso do **processo**. Na Vercel o processo roda em UTC, e Santos é
 * UTC−3: um lead recebido às 22h de terça aparecia no painel como quarta-feira.
 * A notificação por WhatsApp já fixava `America/Sao_Paulo` desde sempre, então
 * as duas superfícies discordavam sobre o mesmo lead — o WhatsApp dizia terça, o
 * painel dizia quarta.
 *
 * O defeito é invisível em desenvolvimento: a máquina de quem programa está em
 * São Paulo, então lá os dois fusos coincidem e a tela mostra o dia certo. Só a
 * produção erra. Por isso a asserção abaixo não depende do fuso da máquina que
 * roda o teste — ela fixa um instante conhecido e cobra o dia de Santos.
 */
const RAIZ_SRC = join(process.cwd(), "src");
const CAMINHO_DO_AJUDANTE = join("src", "lib", "dates.ts");

/** Todo arquivo de código sob `src/`. */
function arquivosDeCodigo(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) return arquivosDeCodigo(caminho);
    return /\.tsx?$/.test(entrada.name) ? [caminho] : [];
  });
}

describe("o fuso do restaurante", () => {
  it("fixa America/Sao_Paulo mesmo quando ninguém pede", () => {
    const fmt = restaurantDateFormat("pt-BR", { dateStyle: "medium" });
    expect(fmt.resolvedOptions().timeZone).toBe("America/Sao_Paulo");
  });

  it("não deixa o chamador trocar o fuso por engano", () => {
    // Passar `timeZone` não deve vencer: o ponto do ajudante é ser o único
    // lugar onde esse valor é decidido.
    const fmt = restaurantDateFormat("pt-BR", {
      dateStyle: "medium",
      timeZone: "UTC",
    });
    expect(fmt.resolvedOptions().timeZone).toBe("America/Sao_Paulo");
  });

  it("mostra o dia de Santos, não o dia de UTC", () => {
    // 21/08/2026 às 23h30 em Santos == 22/08/2026 às 02h30 em UTC.
    // Um lead recebido nesse instante é de sexta-feira, dia 21.
    const instante = new Date("2026-08-22T02:30:00.000Z");
    const rotulo = restaurantDateFormat("pt-BR", {
      dateStyle: "medium",
    }).format(instante);

    expect(rotulo).toContain("21");
    expect(rotulo).not.toContain("22");
  });

  it("é o único lugar em src/ que instancia Intl.DateTimeFormat", () => {
    // A guarda que impede o defeito de voltar: um terceiro consumidor que
    // formate data por conta própria herda o fuso do servidor em silêncio —
    // build verde, teste verde, e a data errada só na produção.
    const infratores = arquivosDeCodigo(RAIZ_SRC)
      .filter((caminho) => relative(process.cwd(), caminho) !== CAMINHO_DO_AJUDANTE)
      .filter((caminho) => /new\s+Intl\.DateTimeFormat\s*\(/.test(readFileSync(caminho, "utf8")))
      .map((caminho) => relative(process.cwd(), caminho).split(sep).join("/"));

    expect(infratores).toEqual([]);
  });

  it("continua havendo código em src/ para varrer — senão a guarda não guarda", () => {
    expect(arquivosDeCodigo(RAIZ_SRC).length).toBeGreaterThan(50);
  });
});
