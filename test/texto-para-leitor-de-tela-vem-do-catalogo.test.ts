import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * O texto que só o leitor de tela ouve também vive no catálogo.
 *
 * `AGENTS.md` diz que toda string de interface vai para `src/messages/pt.json`.
 * A regra não tinha teste, e foi exatamente por aí que três descrições de foto
 * entraram como literal no código em 10/09 — escritas por mim, nas faixas de
 * topo de Horários, Experiência e Contato:
 *
 *   imageAlt="O salão do Restaurante Prato, com as mesas postas"
 *
 * ⚠️ **Por que isto importa mais que arrumação.** Texto alternativo é a única
 * versão da foto que existe para quem não a vê, e é conteúdo que o buscador lê.
 * Fora do catálogo ele fica invisível para quem revisa a copy: não aparece na
 * varredura de emoji, nem na de travessão, nem na de higiene de marca — todas
 * leem o catálogo. Uma frase com o nome do cliente anterior poderia ficar num
 * `alt` para sempre.
 *
 * ⚠️ **`alt=""` continua permitido, e é decisão e não esquecimento.** Foto
 * decorativa, ou foto cuja legenda já está ao lado, pede alt VAZIO: repetir faz
 * o leitor de tela dizer a mesma coisa duas vezes. A guarda só recusa literal
 * com texto dentro.
 *
 * ⚠️ **`placeholder` fica de fora, de propósito.** Os quatro do painel são
 * exemplos de formato — "entradas", "picanha-na-brasa", uma URL de exemplo —, e
 * não prosa: mandá-los para o catálogo poria valor de exemplo no meio da copy
 * do site, e o tradutor de um dia futuro traduziria um slug.
 */

/** Atributos cujo valor é lido como PROSA por leitor de tela ou por buscador. */
const ATRIBUTOS = ["alt", "imageAlt", "aria-label", "title"];

function tsx(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `${dir}/${f}`.replace(/\\/g, "/"));
}

describe("texto para leitor de tela vem do catálogo", () => {
  const arquivos = tsx("src");

  it("nenhum atributo de prosa recebe literal", () => {
    // Sentinela: varredura vazia passaria sem examinar uma linha.
    expect(arquivos.length, "nenhum .tsx encontrado em src/").toBeGreaterThan(30);

    const infratores: string[] = [];
    for (const caminho of arquivos) {
      const texto = readFileSync(caminho, "utf8")
        // Comentário descreve o defeito; código é que o comete. Esta guarda
        // falharia contra a própria explicação deste arquivo se não fizesse isto.
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");

      for (const atributo of ATRIBUTOS) {
        const re = new RegExp(`\\b${atributo}="([^"]{3,})"`, "g");
        for (const achado of texto.matchAll(re)) {
          infratores.push(`${caminho}: ${atributo}="${achado[1]!.slice(0, 46)}"`);
        }
      }
    }

    expect(
      infratores,
      `Texto de interface escrito no código:\n  ${infratores.join("\n  ")}\n` +
        `Mande a frase para src/messages/pt.json e leia com \`t("chave")\`. Fora ` +
        `do catálogo ela fica invisível para as varreduras de copy — emoji, ` +
        `travessão e higiene de marca todas leem o catálogo, não o JSX.`,
    ).toEqual([]);
  });

  it("toda faixa de topo COM FOTO lê a descrição do catálogo", () => {
    /*
     * O outro lado: "cumprir" o teste acima é possível apagando o `imageAlt` —
     * e aí a foto de topo fica sem descrição nenhuma, que é pior que a descrição
     * no lugar errado. Toda página com foto no topo precisa passá-la.
     *
     * ⚠️ **Eram TRÊS páginas até 25/09/2026, e hoje são duas.** O cliente pediu
     * a faixa de `/experiencia` sem foto, em verde da marca — ver
     * `page-header.tsx`. Ela saiu desta lista porque não tem mais foto para
     * descrever, e não porque a regra afrouxou.
     *
     * A lista é derivada da FONTE, e não escrita à mão, justamente para não
     * envelhecer de novo: quem tem `image=` no `PageHeader` tem de ter
     * `imageAlt`. Apagar as duas linhas ao mesmo tempo passaria despercebido
     * numa lista fixa; aqui a página simplesmente sai do conjunto medido, e a
     * sentinela abaixo garante que o conjunto não fique vazio.
     */
    const catalogo = JSON.parse(
      readFileSync("src/messages/pt.json", "utf8"),
    ) as Record<string, Record<string, string>>;

    const candidatas = [
      ["src/app/[locale]/(marketing)/reservas/page.tsx", "reservas"],
      ["src/app/[locale]/(marketing)/experiencia/page.tsx", "experiencia"],
      ["src/app/[locale]/(marketing)/contato/page.tsx", "contact"],
    ] as const;

    const comFoto = candidatas.filter(([caminho]) =>
      /<PageHeader[\s\S]*?image=/.test(readFileSync(caminho, "utf8")),
    );

    // Sentinela: sem ela, o dia em que TODAS as faixas perderem a foto este
    // teste passa sem medir nada e ninguém nota que a guarda parou de guardar.
    expect(
      comFoto.length,
      "nenhuma faixa de topo tem foto — se isso é intencional, esta guarda " +
        "precisa mudar de alvo em vez de aprovar um conjunto vazio",
    ).toBeGreaterThan(0);

    for (const [caminho, namespace] of comFoto) {
      const fonte = readFileSync(caminho, "utf8");
      expect(
        fonte.includes('imageAlt={t("headerAlt")}'),
        `${caminho} tem foto no topo e deixou de descrevê-la`,
      ).toBe(true);
      expect(
        (catalogo[namespace]?.headerAlt ?? "").length,
        `${namespace}.headerAlt está vazia ou não existe`,
      ).toBeGreaterThan(20);
    }
  });
});
