import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O site não pode afirmar uma área de atendimento que ninguém confirmou.
 *
 * Herdado do site da agência e carregado por dois forks sem que a pergunta de
 * conteúdo fosse feita: cada página de `/novidades/[slug]` publicava "Regiões
 * que atendemos com {título}:" seguido de **171 bairros e cidades de São
 * Paulo**, de Itaquera a Ubatuba, em sete abas.
 *
 * O Restaurante Prato é um restaurante de almoço com buffet e churrasco na
 * brasa, na R. Augusto Severo, 25, no Centro de Santos. Não há entrega, não há
 * filial e não há nenhum fato confirmado sobre atender bairro nenhum da capital.
 * O comentário do arquivo original dizia, textualmente, "Regiões onde a N8X
 * atende" — a agência de onde o repositório saiu.
 *
 * ⚠️ O plano de 11/08 mandou MANTER esse componente, e não é contradição
 * desfazê-lo: o argumento de lá era estritamente técnico — ele não usava o
 * model `Service`, então não caía junto com os models de agência. Se o site
 * afirmava um fato do cliente nunca é o que aquele plano perguntou.
 *
 * A regra que decide está no AGENTS.md e é a que rege o rebrand inteiro:
 * substituir só onde existe fato confirmado, **remover** onde não existe.
 * Consertar a acessibilidade daquelas abas teria deixado a afirmação falsa mais
 * fácil de ler.
 *
 * Esta guarda é irmã de `brand-hygiene.test.ts` e tem a mesma forma: procura o
 * FATO afirmado, não o nome de quem o afirmava — um grep por "N8X" não pegaria
 * uma lista de bairros.
 */

/**
 * Bairros da capital paulista que não têm por que aparecer no site de um
 * restaurante do Centro de Santos. Se algum dia o cliente confirmar entrega ou
 * filial, o dado entra com fonte e esta lista muda junto.
 */
const BAIRROS_DA_CAPITAL = [
  "Itaquera",
  "Jaçanã",
  "Capão Redondo",
  "Cidade Tiradentes",
  "Freguesia do Ó",
  "Vila Prudente",
  "Tucuruvi",
  "Perdizes",
];

/** A promessa em si, independente da lista que vier depois dela. */
const PROMESSAS = [/Regi[õo]es que atendemos/i, /Regi[õo]es onde a .{1,12} atende/i];

const EXTENSOES = new Set([".ts", ".tsx", ".json", ".css", ".mjs"]);

function arquivos(dir: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(dir)) {
    if (nome === "node_modules" || nome === ".next" || nome.startsWith(".")) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) saida.push(...arquivos(caminho));
    else if (EXTENSOES.has(extname(nome))) saida.push(caminho);
  }
  return saida;
}

describe("o site não inventa área de atendimento", () => {
  // `src/` e `prisma/`. `docs/` fica de fora pelo mesmo motivo do
  // `brand-hygiene.test.ts`: planos e specs são registro histórico.
  const alvos = [...arquivos("src"), ...arquivos("prisma")];

  it("varreu de fato os arquivos do projeto", () => {
    // Sentinela: sem isto, um erro no caminho faria as duas checagens abaixo
    // passarem sobre uma lista vazia.
    expect(alvos.length).toBeGreaterThan(100);
  });

  it("não lista bairros da capital paulista", () => {
    const achados: string[] = [];
    for (const caminho of alvos) {
      const texto = readFileSync(caminho, "utf8");
      for (const bairro of BAIRROS_DA_CAPITAL) {
        if (texto.includes(bairro)) achados.push(`${caminho}: "${bairro}"`);
      }
    }
    expect(achados, achados.join("\n")).toEqual([]);
  });

  it("não promete atender regiões", () => {
    const achados: string[] = [];
    for (const caminho of alvos) {
      const texto = readFileSync(caminho, "utf8");
      for (const promessa of PROMESSAS) {
        const casou = texto.match(promessa);
        if (casou) achados.push(`${caminho}: "${casou[0]}"`);
      }
    }
    expect(achados, achados.join("\n")).toEqual([]);
  });
});
