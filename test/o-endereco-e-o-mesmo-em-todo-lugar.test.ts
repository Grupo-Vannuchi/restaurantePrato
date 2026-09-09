import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";

/**
 * O número do endereço é o mesmo em todo lugar que o escreve.
 *
 * O Prato fica na R. Augusto Severo, **25**. O número saiu de uma divergência
 * longa: o documento de copy entregue pelo cliente escrevia "09" em dois
 * lugares, o CNPJ e o dado confirmado em 17/08 diziam 25, e a disputa só fechou
 * em 03/09/2026, quando chegou a fotografia da fachada com a placa.
 *
 * ⚠️ **O que esta guarda protege é a CONSISTÊNCIA, não o valor.** Trocar o
 * número em `siteConfig` e este teste passa a exigir o novo em todo lugar — é
 * isso que se quer, porque o endereço tem uma fonte e várias cópias.
 *
 * ⚠️ **E ele existe porque a contagem já envelheceu uma vez.** A pendência
 * antiga afirmava que o endereço estava "acoplado a quatro lugares". Eram sete
 * quando alguém foi conferir: páginas novas foram acrescentando o endereço à
 * copy — a descrição da galeria, a do contato, o subtítulo do contato — sem
 * ninguém atualizar a lista. Uma lista escrita à mão de onde um dado aparece
 * envelhece a cada página nova; uma varredura, não.
 *
 * O modo de falhar é específico e caro: um número trocado em UM lugar manda o
 * visitante para a porta errada, e o lugar errado pode ser a descrição que o
 * Google mostra no resultado de busca, ou o documento de LGPD, onde endereço
 * errado deixa de ser cosmético.
 *
 * `docs/` fica de fora de propósito: os planos e specs em `docs/superpowers/`
 * são registro histórico e citam o "09" ao contar a divergência. Congelá-los
 * seria apagar o motivo de a decisão ter sido tomada.
 */
const RAIZ = join(process.cwd(), "src");
const EXTENSOES = new Set([".ts", ".tsx", ".json"]);

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(dir, e.name);
    if (e.isDirectory()) return arquivos(caminho);
    return EXTENSOES.has(extname(e.name)) ? [caminho] : [];
  });
}

/** O logradouro, sem número — é por ele que a varredura encontra as cópias. */
const LOGRADOURO = "Augusto Severo";

/** O número que vale, lido da fonte única em vez de escrito aqui. */
const NUMERO = /Augusto Severo,\s*(?:nº\s*)?(\d+)/.exec(siteConfig.contact.address.street)?.[1];

/** Cada menção ao logradouro, com o número que vem logo depois dele. */
function mencoes(): { arquivo: string; numero: string | null; trecho: string }[] {
  const achados: { arquivo: string; numero: string | null; trecho: string }[] = [];
  for (const caminho of arquivos(RAIZ)) {
    const fonte = readFileSync(caminho, "utf8");
    if (!fonte.includes(LOGRADOURO)) continue;
    for (const linha of fonte.split(/\r?\n/)) {
      if (!linha.includes(LOGRADOURO)) continue;
      // Aceita "Augusto Severo, 25" e "Augusto Severo, nº 25" — as duas formas
      // existem no repositório, a segunda no documento jurídico.
      const m = /Augusto Severo,\s*(?:nº\s*)?(\d+)/.exec(linha);
      achados.push({
        arquivo: relative(process.cwd(), caminho).replace(/\\/g, "/"),
        numero: m ? m[1]! : null,
        trecho: linha.trim().slice(0, 110),
      });
    }
  }
  return achados;
}

describe("o endereço do restaurante", () => {
  const todas = mencoes();

  it("tem um número na configuração, que é a fonte", () => {
    // Sentinela dupla: sem isto, um `siteConfig` sem número deixaria `NUMERO`
    // indefinido e as comparações abaixo passariam por vacuidade.
    expect(NUMERO, `não achei número em "${siteConfig.contact.address.street}"`).toBeDefined();
    expect(NUMERO).toMatch(/^\d+$/);
  });

  it("aparece em mais de um lugar, senão não há consistência a verificar", () => {
    // A varredura precisa encontrar as cópias de fato. Um recorte quebrado
    // devolveria lista vazia e o teste seguinte passaria sem examinar nada.
    expect(todas.length, "a varredura não encontrou o logradouro em src/").toBeGreaterThan(3);
  });

  it("escreve o mesmo número em toda cópia", () => {
    const divergentes = todas
      .filter((m) => m.numero !== NUMERO)
      .map((m) => `${m.arquivo}: [${m.numero ?? "sem número"}] ${m.trecho}`);

    expect(
      divergentes,
      divergentes.length
        ? `A configuração diz ${NUMERO}, mas estas cópias dizem outra coisa:\n  ${divergentes.join("\n  ")}`
        : "",
    ).toEqual([]);
  });
});
