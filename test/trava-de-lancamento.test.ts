import { describe, expect, it } from "vitest";

import {
  impedimentoParaIndexar,
  legalEntity,
  pendenciasLegais,
} from "@/content/legal";

/**
 * A tranca que separa "no ar" de "no Google".
 *
 * `src/content/legal.ts` marca com `«PENDENTE: …»` todo dado do cliente que
 * ainda não chegou, em vez de preencher por aproximação — dado de outra empresa
 * num documento de LGPD é pior que campo em branco. Hoje falta só o domínio.
 *
 * O aviso de não publicar existia em comentário, e comentário não impede nada.
 * A regra passa a ser cobrada: `SITE_INDEXABLE=true` com pendência derruba a
 * construção do site, e não vira uma página indexada com documento incompleto.
 *
 * Errar aqui não custa um retrabalho, custa uma retirada: página indexada sob
 * o host errado leva semanas para sair do índice.
 */
describe("pendências dos documentos legais", () => {
  it("encontra o que ainda falta, hoje", () => {
    // Se este teste começar a falhar porque a lista esvaziou, ótimo: significa
    // que o domínio chegou. Aí é trocar por `toEqual([])`.
    expect(pendenciasLegais()).toContain("site");
  });

  it("não confunde dado preenchido com pendência", () => {
    expect(pendenciasLegais()).not.toContain("cnpj");
    expect(pendenciasLegais()).not.toContain("legalName");
    expect(legalEntity.cnpj).toBe("03.354.096/0001-84");
  });

  it("lê a entidade que receber, para poder ser testada de verdade", () => {
    expect(pendenciasLegais({ a: "valor real", b: "«PENDENTE: coisa»" })).toEqual(["b"]);
    expect(pendenciasLegais({ a: "valor real" })).toEqual([]);
  });
});

describe("impedimento para abrir aos buscadores", () => {
  it("deixa passar quando não há pendência", () => {
    expect(impedimentoParaIndexar(true, [])).toBeNull();
  });

  it("deixa passar quando o site está fechado, mesmo com pendência", () => {
    // Fechado é o estado normal do projeto hoje. A tranca só age na abertura.
    expect(impedimentoParaIndexar(false, ["site"])).toBeNull();
  });

  it("barra a abertura com pendência, e diz qual", () => {
    const erro = impedimentoParaIndexar(true, ["site", "cnpj"]);
    expect(erro).toContain("site");
    expect(erro).toContain("cnpj");
    expect(erro).toContain("SITE_INDEXABLE");
  });
});
