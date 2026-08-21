import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

import { locales } from "@/i18n/routing";

/**
 * `revalidatePath` não invalida rota de idioma que não existe.
 *
 * O site nasceu como fork de um projeto bilíngue e herdou o hábito de invalidar
 * "os dois prefixos": `/admin/leads` **e** `/en/admin/leads`. O Prato é só em
 * português — `locales = ["pt"]` —, então a segunda chamada aponta para uma
 * rota que não existe em lugar nenhum. Não quebra nada, e é justamente esse o
 * problema: parece cuidado com i18n, some no meio de um bloco `try`, e o
 * comentário ao lado ("revalidate both prefixes") afirma como verdade uma coisa
 * que deixou de ser verdade no rebrand.
 *
 * A guarda olha só para chamadas de código. Os comentários que explicam a regra
 * geral do `localePrefix: "as-needed"` — em `robots.ts`, `routing.ts`, `seo.ts`
 * — citam `/en` como exemplo do comportamento do next-intl e continuam certos.
 */
const RAIZ_SRC = join(process.cwd(), "src");
const CHAMADA = /revalidatePath\(\s*["'`]([^"'`]+)["'`]/g;

function arquivosDeCodigo(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) return arquivosDeCodigo(caminho);
    return /\.tsx?$/.test(entrada.name) ? [caminho] : [];
  });
}

/** Todo caminho literal passado a `revalidatePath` em `src/`, com o arquivo. */
function caminhosRevalidados(): { arquivo: string; caminho: string }[] {
  return arquivosDeCodigo(RAIZ_SRC).flatMap((arquivo) => {
    const fonte = readFileSync(arquivo, "utf8");
    return [...fonte.matchAll(CHAMADA)].map((m) => ({
      arquivo: relative(process.cwd(), arquivo).split(sep).join("/"),
      caminho: m[1]!,
    }));
  });
}

describe("a revalidação de rota", () => {
  it("não cita prefixo de idioma que o site não tem", () => {
    // Um primeiro segmento de duas letras só pode ser prefixo de idioma. Se for
    // um idioma que não está em `locales`, a rota não existe.
    const fantasmas = caminhosRevalidados().filter(({ caminho }) => {
      const primeiro = caminho.split("/").filter(Boolean)[0] ?? "";
      return (
        /^[a-z]{2}(-[A-Z]{2})?$/.test(primeiro) &&
        !(locales as readonly string[]).includes(primeiro)
      );
    });

    expect(fantasmas).toEqual([]);
  });

  it("continua havendo revalidação para conferir — senão a guarda não guarda", () => {
    expect(caminhosRevalidados().length).toBeGreaterThan(0);
  });
});
