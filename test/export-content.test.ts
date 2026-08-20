import { describe, expect, it } from "vitest";

import { montarExportacao, nomeDoArquivo } from "../prisma/export-content";

/**
 * Forma do arquivo de backup.
 *
 * O que importa aqui é o contrato com quem for restaurar, um dia, provavelmente
 * com pressa: o arquivo precisa dizer **quando** foi feito e **quanto** tem
 * dentro, sem que ninguém precise abrir e contar. Um backup que parece completo
 * e está vazio é pior que backup nenhum, porque adia a descoberta.
 */
describe("exportação de conteúdo", () => {
  const agora = new Date("2026-08-20T17:04:09.123Z");

  it("registra a data da exportação", () => {
    const saida = montarExportacao({ menuItems: [] }, agora);
    expect(saida.exportadoEm).toBe("2026-08-20T17:04:09.123Z");
  });

  it("conta cada tabela, para o arquivo se auto-conferir", () => {
    const saida = montarExportacao(
      { menuItems: [{ id: "a" }, { id: "b" }], leads: [{ id: "c" }] },
      agora,
    );
    expect(saida.contagens).toEqual({ menuItems: 2, leads: 1 });
  });

  it("preserva os dados sem reordenar nem transformar", () => {
    const itens = [{ id: "a", nome: "Picanha" }];
    const saida = montarExportacao({ menuItems: itens }, agora);
    expect(saida.dados.menuItems).toEqual(itens);
  });

  it("nomeia o arquivo de forma ordenável e sem caractere proibido", () => {
    const nome = nomeDoArquivo(agora);
    // Dois-pontos é inválido em nome de arquivo no Windows, e o ponto do
    // milissegundo confundiria a extensão.
    expect(nome).toBe("conteudo-2026-08-20T17-04-09.json");
    expect(nome).not.toMatch(/:/);
  });

  it("mantém a ordem cronológica na ordem alfabética dos nomes", () => {
    const antes = nomeDoArquivo(new Date("2026-08-20T09:00:00Z"));
    const depois = nomeDoArquivo(new Date("2026-08-20T17:00:00Z"));
    expect([depois, antes].sort()).toEqual([antes, depois]);
  });
});
