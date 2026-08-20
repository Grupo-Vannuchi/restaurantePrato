import { describe, expect, it } from "vitest";

import { ordemDeInsercao, validarExportacao } from "../prisma/import-content";

/**
 * Leitura do arquivo de backup, do lado de quem restaura.
 *
 * Restaurar é a operação que ninguém ensaia e todo mundo faz com pressa, depois
 * de já ter perdido alguma coisa. As duas perguntas que precisam ter resposta
 * **antes** de escrever qualquer linha no banco são: este arquivo é o que diz
 * ser, e em que ordem as tabelas entram sem quebrar referência.
 */
describe("validação do arquivo de backup", () => {
  const valido = {
    exportadoEm: "2026-08-20T17:59:51.000Z",
    contagens: { menuItems: 1 },
    dados: { menuItems: [{ id: "a" }] },
  };

  it("aceita um arquivo íntegro", () => {
    expect(validarExportacao(valido)).toEqual([]);
  });

  it("recusa o que não tem a forma de uma exportação", () => {
    expect(validarExportacao({ menuItems: [] })).not.toEqual([]);
    expect(validarExportacao(null)).not.toEqual([]);
    expect(validarExportacao("texto")).not.toEqual([]);
  });

  it("recusa arquivo truncado, comparando a contagem com o conteúdo", () => {
    // É para isto que a contagem existe. Um download interrompido, ou um
    // arquivo colado pela metade, chega com a promessa e sem o conteúdo — e
    // restaurar isso em silêncio apaga a diferença sem ninguém ver.
    const truncado = {
      ...valido,
      contagens: { menuItems: 30 },
      dados: { menuItems: [{ id: "a" }] },
    };
    const erros = validarExportacao(truncado);
    expect(erros.length).toBe(1);
    expect(erros[0]).toContain("menuItems");
    expect(erros[0]).toContain("30");
  });
});

describe("ordem de inserção", () => {
  it("põe a categoria antes do prato que aponta para ela", () => {
    const ordem = ordemDeInsercao({ menuItems: [], menuCategories: [] });
    expect(ordem.indexOf("menuCategories")).toBeLessThan(ordem.indexOf("menuItems"));
  });

  it("deixa o admin de fora — o backup não tem o hash da senha", () => {
    // Recriar o usuário sem hash produziria uma conta impossível de usar e,
    // pior, uma que parece existir. `npm run db:set-admin` é o caminho.
    expect(ordemDeInsercao({ adminUsers: [] })).toEqual([]);
  });

  it("ignora tabela que o arquivo não traz", () => {
    expect(ordemDeInsercao({ leads: [] })).toEqual(["leads"]);
  });

  it("recusa tabela desconhecida em vez de tentar escrever nela", () => {
    expect(() => ordemDeInsercao({ tabelaInventada: [] })).toThrow(/tabelaInventada/);
  });
});
