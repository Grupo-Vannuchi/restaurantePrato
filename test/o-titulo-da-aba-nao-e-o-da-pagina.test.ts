import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import mensagens from "@/messages/pt.json";

/**
 * O `title` da aba e o `<h1>` da página são dois textos, para dois públicos.
 *
 * **Medido em 09/10/2026, no site publicado.** Quatro rotas saíam com `title`
 * curtíssimo — `/galeria` 27 caracteres, `/reservas` 28, `/novidades` 29,
 * `/experiencia` 33 — contra os ~60 que o Google mostra, e nenhuma delas
 * carregava termo de intenção local. A home, que tem texto próprio, saía com
 * 66 e bem resolvida.
 *
 * ⚠️ **A causa não era esquecimento, era acoplamento**, e é isso que esta
 * guarda protege. As duas coisas vinham da MESMA chave `title`: o
 * `generateMetadata` e o `<PageHeader>`. Com uma chave só não existe correção
 * sem estrago — encher o `<h1>` de palavra-chave estraga a página para quem
 * lê, e encurtar o `title` para caber na voz da marca joga fora a vitrine do
 * resultado de busca.
 *
 * Então: `metaTitle` é só do buscador, `title` é o que a pessoa lê. Quem
 * "simplificar" isto de volta para uma chave reabre o desperdício sem que
 * nada falhe — build verde, página 200, e 27 caracteres na aba.
 *
 * O orçamento sai do próprio catálogo: o sufixo vem do `titleTemplate` do
 * layout, então o teto da chave é o que sobra dele. Ler o template em vez de
 * fixar 20 caracteres é o que mantém a conta certa se a marca mudar de nome.
 */
const ROTAS = ["galeria", "reservas", "novidades", "experiencia"] as const;

/** O que o Google exibe antes de cortar, em caracteres. */
const VITRINE = 60;

const catalogo = mensagens as unknown as {
  metadata: { titleTemplate: string };
  [k: string]: unknown;
};

/** `"%s · {brand}"` menos o `%s` é o que cada chave paga de sufixo. */
const SUFIXO = catalogo.metadata.titleTemplate
  .replace("%s", "")
  .replace("{brand}", "Restaurante Prato").length;

const daRota = (rota: string) =>
  (catalogo as Record<string, { title: string; metaTitle?: string }>)[rota]!;

describe("o titulo da aba e o da pagina", () => {
  it("o template continua existindo — senão o orçamento abaixo é inventado", () => {
    // Sentinela: sem template, SUFIXO viraria o tamanho de uma string vazia e
    // todo teto abaixo passaria folgado.
    expect(catalogo.metadata.titleTemplate).toContain("%s");
    expect(SUFIXO).toBeGreaterThan(10);
  });

  it.each(ROTAS)("%s declara um metaTitle próprio", (rota) => {
    const m = daRota(rota);
    expect(m.metaTitle, `${rota} não tem metaTitle: a aba voltou a usar o <h1>`).toBeTruthy();
  });

  it.each(ROTAS)("o metaTitle de %s não é só o <h1> outra vez", (rota) => {
    const m = daRota(rota);
    // Se alguém copiar o `title` para cá, o desacoplamento existe no código e
    // não existe no resultado.
    expect(m.metaTitle).not.toBe(m.title);
  });

  it.each(ROTAS)("o título completo de %s cabe na vitrine do Google", (rota) => {
    const m = daRota(rota);
    const total = (m.metaTitle ?? m.title).length + SUFIXO;
    expect(
      total,
      `"${m.metaTitle} · Restaurante Prato" dá ${total} caracteres, e o Google ` +
        `corta em ~${VITRINE}. Encurte a chave, não o sufixo.`,
    ).toBeLessThanOrEqual(VITRINE);
  });

  it.each(ROTAS)("o metaTitle de %s não desperdiça a vitrine", (rota) => {
    const m = daRota(rota);
    const total = (m.metaTitle ?? m.title).length + SUFIXO;
    // O defeito que gerou esta guarda era o lado CURTO: 27 de 60. Um piso
    // impede que a correção se desfaça aos poucos, uma palavra por vez.
    expect(
      total,
      `"${m.metaTitle}" deixa ${VITRINE - total} caracteres de vitrine sem uso`,
    ).toBeGreaterThanOrEqual(45);
  });

  it("o <h1> da página segue vindo de `title`, e não do metaTitle", () => {
    // A metade de trás do desacoplamento: se o PageHeader passar a usar
    // metaTitle, a página volta a ter título de buscador na tela.
    for (const rota of ROTAS) {
      const fonte = readFileSync(
        join(process.cwd(), "src", "app", "[locale]", "(marketing)", rota, "page.tsx"),
        "utf8",
      );
      expect(fonte, `${rota}: o <h1> não vem de t("title")`).toMatch(/title=\{t\("title"\)\}/);
      expect(fonte, `${rota}: o metadata não usa t("metaTitle")`).toMatch(
        /title: t\("metaTitle"\)/,
      );
    }
  });
});
