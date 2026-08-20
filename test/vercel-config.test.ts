import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guarda do `vercel.json`.
 *
 * A configuração de deploy já mordeu duas vezes no dia em que a infra subiu, e
 * as duas falhas eram silenciosas no repositório: viviam no painel da Vercel,
 * onde nenhum teste alcança. Trazer a decisão para o arquivo versionado é o que
 * torna esta guarda possível.
 */
const config = JSON.parse(
  readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
) as {
  framework?: string;
  regions?: string[];
  buildCommand?: string;
  git?: { deploymentEnabled?: Record<string, boolean> };
};

describe("configuração de deploy", () => {
  it("declara o framework em vez de deixar a Vercel adivinhar", () => {
    // Um projeto criado vazio (`vercel project add`) nasce com o preset
    // "Other", que serve `public/` como site estático. O valor daqui tem
    // precedência sobre o painel.
    expect(config.framework).toBe("nextjs");
  });

  it("constrói na região de São Paulo", () => {
    expect(config.regions).toEqual(["gru1"]);
  });

  it("aplica as migrações antes de construir", () => {
    expect(config.buildCommand).toContain("prisma migrate deploy");
  });

  it("não constrói preview da Development", () => {
    // O projeto tem um banco só. Com as variáveis de produção disponíveis num
    // build de preview, o `prisma migrate deploy` do buildCommand rodaria
    // contra o banco do cliente — uma branch com migração nova alteraria a
    // produção sem ninguém pedir. Enquanto não existir um banco separado para
    // preview, a branch de trabalho não constrói.
    expect(config.git?.deploymentEnabled?.Development).toBe(false);
  });
});
