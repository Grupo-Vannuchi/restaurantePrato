import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import pt from "@/messages/pt.json";
import { siteConfig } from "@/config/site";

/**
 * O título do cartão de compartilhamento cabe no cartão; o da busca, não precisa.
 *
 * ⚠️ **São dois campos, com dois públicos, e a auditoria de SEO de 17/09/2026
 * pediu o corte em um só.** Sem `openGraph.title`, o Next reaproveita o
 * `<title>` como `og:title` — e a home saía com 66 caracteres no cartão, onde o
 * Facebook corta perto de 60. O que desaparecia no corte não era o fim da frase
 * por acaso: era o nome do bairro, que é justamente o diferencial local.
 *
 * O `<title>` fica como está, com "no Centro de Santos" inteiro: buscador não
 * corta em 60, rede social corta. Unificar as duas strings — que é o reflexo
 * natural de quem vê duas frases quase iguais no catálogo — reabre o problema
 * dos dois lados, porque encurtar o `<title>` custa a palavra-chave local.
 *
 * Por isso a guarda cobra o teto de um e o PISO do outro: só o teto faria o
 * conserto óbvio (encurtar os dois) passar.
 */

/** O limite prático do cartão do Facebook. O do Twitter é mais folgado. */
const TETO_DO_CARTAO = 60;

/** Resolve o `{brand}` como as duas chamadas reais resolvem. */
const resolvido = (chave: "ogTitle" | "defaultTitle") =>
  pt.metadata[chave].replace("{brand}", siteConfig.name);

describe("os títulos de metadado", () => {
  it("o `og:title` da home cabe no cartão de compartilhamento", () => {
    const titulo = resolvido("ogTitle");
    expect(
      titulo.length,
      `og:title com ${titulo.length} caracteres: "${titulo}" — o corte come o fim`,
    ).toBeLessThanOrEqual(TETO_DO_CARTAO);
  });

  it("o `<title>` continua dizendo o bairro, e não foi encurtado junto", () => {
    // O piso: se alguém "unificar" os dois, esta é a asserção que reclama.
    const titulo = resolvido("defaultTitle");
    expect(titulo).toContain("Centro de Santos");
    expect(
      titulo.length,
      "o `<title>` encolheu: ele não tem teto de 60, e o bairro é palavra-chave",
    ).toBeGreaterThan(TETO_DO_CARTAO);
  });

  it("os dois são strings diferentes — senão um deles não está sendo usado", () => {
    // Sentinela: com as duas iguais, uma das asserções acima passaria por
    // acidente e o `og:title` voltaria a ser o `<title>` sem ninguém notar.
    expect(resolvido("ogTitle")).not.toBe(resolvido("defaultTitle"));
  });

  it("a home declara o `og:title` — a chave existir não a publica", () => {
    // A lição de `os-fatos-do-llms-txt.test.ts`: chave no catálogo não é campo
    // na página. `e2e/metadata-routes.spec.ts` mede o HTML publicado; aqui se cobra
    // que a home passe a chave adiante, que é o elo que faltaria primeiro.
    const fonte = readFileSync(
      join(process.cwd(), "src", "app", "[locale]", "(marketing)", "page.tsx"),
      "utf8",
    );
    expect(fonte).toMatch(/localeMetadata\([^)]*\{\s*title:\s*t\("ogTitle"/);
  });
});

/**
 * As descrições do catálogo: tamanho, e nenhum marcador interno vazando.
 *
 * ⚠️ **Achado da reauditoria de 18/09/2026, no site PUBLICADO.** As páginas
 * legais usavam o primeiro parágrafo do próprio documento como
 * `<meta name="description">`. Duas consequências:
 *
 * · 370 caracteres em `/privacy` e 350 em `/terms`, contra o corte de ~160 —
 *   o trecho aparecia cortado no meio da qualificação da empresa;
 * · `/terms` publicava `«PENDENTE: domínio final do site»` na meta tag.
 *
 * ⚠️ **E o `«PENDENTE»` no CORPO do documento continua certo** — é ele que
 * impede alguém de inventar o domínio, e é por isso que `SITE_INDEXABLE` é
 * `false`. A guarda abaixo cobra só o catálogo de metadados, não
 * `src/content/legal.ts`: cobrar o marcador no documento inteiro quebraria de
 * propósito o mecanismo que o projeto usa para não inventar dado de cliente.
 */
describe("as descrições de metadado", () => {
  const descricoes = Object.entries(pt.metadata).filter(([chave]) =>
    /escription/.test(chave),
  ) as [string, string][];

  it("existem — senão esta suíte não está olhando nada", () => {
    // Sentinela: se as chaves forem renomeadas, as duas asserções abaixo
    // passariam varrendo uma lista vazia.
    expect(descricoes.length).toBeGreaterThanOrEqual(3);
  });

  it.each([["cabem no limite de corte"]])("%s", () => {
    const longas = descricoes.filter(([, texto]) => texto.length > 160);
    expect(
      longas.map(([chave, texto]) => `${chave}: ${texto.length} caracteres`),
      "descrição acima de 160: o buscador corta no meio da frase",
    ).toEqual([]);
  });

  it("não publicam marcador de pendência", () => {
    const vazando = descricoes.filter(([, texto]) => /PENDENTE/i.test(texto));
    expect(
      vazando.map(([chave]) => chave),
      "marcador interno numa meta tag: ele serve à equipe, não ao visitante",
    ).toEqual([]);
  });
});
