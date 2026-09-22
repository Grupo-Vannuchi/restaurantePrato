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
 * num documento de LGPD é pior que campo em branco.
 *
 * ⚠️ **Desde 22/09/2026 não falta nenhum.** O último era o domínio, preenchido
 * quando `restauranteprato.com.br` passou a responder pela Vercel — e não
 * quando foi decidido, que é uma data três dias anterior. A trava continua
 * existindo e continua correta; o que mudou é que ela não tem mais o que
 * barrar.
 *
 * O aviso de não publicar existia em comentário, e comentário não impede nada.
 * A regra passa a ser cobrada: `SITE_INDEXABLE=true` com pendência derruba a
 * construção do site, e não vira uma página indexada com documento incompleto.
 *
 * Errar aqui não custa um retrabalho, custa uma retirada: página indexada sob
 * o host errado leva semanas para sair do índice.
 */
describe("pendências dos documentos legais", () => {
  it("não falta nenhum — e o domínio é um domínio, não um vazio", () => {
    /*
     * A versão anterior cobrava `toContain("site")` e deixou escrito o que
     * fazer quando esvaziasse: "ótimo, significa que o domínio chegou; aí é
     * trocar por `toEqual([])`". Foi o que aconteceu em 22/09/2026.
     *
     * ⚠️ Mas `toEqual([])` sozinho passaria com o campo APAGADO, e apagar é o
     * jeito mais fácil de "resolver" uma pendência: sem o campo, não há
     * `«PENDENTE»` para encontrar, e os Termos passariam a falar de um site sem
     * nome. Por isso as duas asserções andam juntas — a lista vazia E o valor
     * parecendo um domínio de verdade.
     */
    expect(pendenciasLegais()).toEqual([]);
    expect(legalEntity.site).toMatch(/^[a-z0-9.-]+\.[a-z]{2,}$/);
    expect(legalEntity.site).not.toMatch(/PENDENTE/);
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
