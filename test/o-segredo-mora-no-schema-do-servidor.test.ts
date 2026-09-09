import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Variável de servidor precisa estar no schema DO SERVIDOR.
 *
 * ⚠️ Este teste nasceu de um defeito real, e de um que não daria as caras até o
 * pior momento possível. As quatro variáveis do Instagram foram declaradas
 * dentro do `clientSchema` em vez do `serverSchema`, por eu ter ancorado a
 * edição na linha errada.
 *
 * O que isso causa: `parseClientEnv()` valida um objeto montado à mão, com
 * apenas `NEXT_PUBLIC_SITE_URL` dentro. Toda variável declarada ali e ausente
 * daquele objeto sai `undefined`, e as que têm padrão saem no padrão. Ou seja:
 *
 * - `INSTAGRAM_ACCESS_TOKEN` seria SEMPRE `undefined`, mesmo com o token certo
 *   configurado na Vercel;
 * - `isInstagramConfigured()` devolveria sempre `false`;
 * - o feed nunca apareceria, e nada acusaria — nem build, nem typecheck, nem
 *   teste. Só a ausência silenciosa da seção, no dia em que as credenciais
 *   chegassem e alguém fosse conferir.
 *
 * Foi assim que ele apareceu: o modo de pré-visualização não desenhou, e o
 * rastro levou até aqui.
 *
 * A guarda é por MECANISMO: toda variável sem o prefixo `NEXT_PUBLIC_` tem de
 * estar no schema do servidor, e nenhuma delas pode estar no do cliente. O
 * schema do cliente é o que vai para o navegador.
 */
const FONTE = readFileSync(join(process.cwd(), "src/lib/env.ts"), "utf8");

/** Recorta o corpo de um schema, do `z.object({` até o `});` que o fecha. */
function corpoDoSchema(nome: string): string {
  const inicio = FONTE.indexOf(`const ${nome} = z.object({`);
  expect(inicio, `schema ${nome} não encontrado`).toBeGreaterThan(-1);
  const fim = FONTE.indexOf("\n});", inicio);
  expect(fim, `fim do schema ${nome} não encontrado`).toBeGreaterThan(inicio);
  return FONTE.slice(inicio, fim);
}

/** Nomes de variável declarados num corpo de schema. */
function chaves(corpo: string): string[] {
  return [...corpo.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):/gm)].map((m) => m[1]!);
}

describe("a separação entre servidor e cliente no env", () => {
  const doServidor = chaves(corpoDoSchema("serverSchema"));
  const doCliente = chaves(corpoDoSchema("clientSchema"));

  it("leu os dois schemas de fato", () => {
    // Sentinela: um recorte errado deixaria as duas checagens abaixo vazias.
    expect(doServidor.length).toBeGreaterThan(5);
    expect(doCliente.length).toBeGreaterThan(0);
  });

  it("o schema do cliente só tem variáveis públicas", () => {
    // O que está aqui vai para o navegador. Uma variável de servidor declarada
    // neste schema sai `undefined` em silêncio, porque `parseClientEnv` monta o
    // objeto à mão e só inclui as públicas.
    const intrusas = doCliente.filter((k) => !k.startsWith("NEXT_PUBLIC_"));
    expect(intrusas, intrusas.join(", ")).toEqual([]);
  });

  it("as variáveis do Instagram estão no schema do servidor", () => {
    // O caso concreto que originou esta guarda. Uma delas é um TOKEN.
    for (const chave of [
      "INSTAGRAM_ACCESS_TOKEN",
      "INSTAGRAM_USER_ID",
      "INSTAGRAM_API_VERSION",
      "INSTAGRAM_POST_LIMIT",
      "INSTAGRAM_PREVIEW",
    ]) {
      expect(doServidor, `${chave} fora do schema do servidor`).toContain(chave);
    }
  });

  it("nenhum segredo carrega o prefixo público", () => {
    // `NEXT_PUBLIC_*` é embutido no pacote que vai ao navegador. Um token com
    // esse prefixo é um token publicado.
    const perigosas = /NEXT_PUBLIC_[A-Z0-9_]*(TOKEN|SECRET|KEY|PASSWORD)/;
    expect(FONTE).not.toMatch(perigosas);
  });
});
