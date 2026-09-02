import { readFileSync, readdirSync, existsSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";
import mensagens from "@/messages/pt.json";

/**
 * O site tem UMA página de cardápio, e ela é `/cardapio`.
 *
 * `/gastronomia` era a vitrine do cardápio herdada do fork: uma grade de cards
 * com foto. `/cardapio` é o cardápio digital de verdade, com os dias da semana,
 * o buffet e a ilha de massas. Manter as duas significaria duas páginas contando
 * a mesma coisa de jeitos diferentes, e o visitante escolhendo a errada pela
 * ordem do menu.
 *
 * ⚠️ **A rota é três edições acopladas**, e o `AGENTS.md` avisa disso: o tipo
 * `NavKey` em `config/site.ts`, as chaves de `nav` em `pt.json` e o nome da
 * pasta sob `(marketing)/` precisam concordar. Duas concordando e a terceira
 * não é um 404 que só aparece em produção.
 *
 * E há mais quatro superfícies que ninguém lembra na hora: o mapa do site, o
 * `llms.txt`, os dados estruturados que dizem ao Google onde está o cardápio, e
 * o rótulo da página de origem do lead.
 */
const RAIZ = process.cwd();
const ler = (p: string) => readFileSync(join(RAIZ, p), "utf8");

/** `docs/` fica fora: planos e specs são registro histórico do projeto. */
const PASTAS = ["src", "e2e", "test"];

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(dir, entrada.name);
    if (entrada.isDirectory()) return arquivos(caminho);
    return [".ts", ".tsx", ".css", ".json"].includes(extname(entrada.name))
      ? [caminho]
      : [];
  });
}

/**
 * Sem comentários: este arquivo cita a rota antiga para explicar por que ela
 * saiu, e seis guardas deste projeto já falharam casando com a própria
 * documentação.
 */
const semComentarios = (texto: string) =>
  texto
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/.*$/gm, "");

describe("a rota do cardápio", () => {
  it("a página existe, e a antiga não", () => {
    expect(existsSync(join(RAIZ, "src/app/[locale]/(marketing)/cardapio/page.tsx"))).toBe(
      true,
    );
    expect(
      existsSync(join(RAIZ, "src/app/[locale]/(marketing)/gastronomia")),
      "a pasta antiga ainda existe",
    ).toBe(false);
  });

  it("as três edições acopladas concordam", () => {
    // O item de navegação, a chave do catálogo e a pasta.
    const item = siteConfig.nav.find((n) => n.href === "/cardapio");
    expect(item, "nenhum item de navegação aponta para /cardapio").toBeDefined();
    const rotulo = (mensagens as { nav: Record<string, string> }).nav[item!.key];
    expect(rotulo, `falta nav.${item!.key} no catálogo`).toBeTruthy();
    expect((mensagens as { nav: Record<string, string> }).nav.gastronomia).toBeUndefined();
  });

  it("nenhum item de navegação aponta para a rota antiga", () => {
    expect(siteConfig.nav.map((n) => n.href)).not.toContain("/gastronomia");
  });

  it("as quatro superfícies que ninguém lembra apontam para a nova", () => {
    // Mapa do site, dados estruturados, llms.txt e o rótulo de origem do lead.
    expect(semComentarios(ler("src/app/sitemap.ts"))).toContain("/cardapio");
    expect(semComentarios(ler("src/components/json-ld.tsx"))).toContain("/cardapio");
    expect(semComentarios(ler("src/app/llms.txt/route.ts"))).toContain("/cardapio");
    expect(semComentarios(ler("src/lib/lead-landing.ts"))).toContain("cardapio");
  });

  it("não sobrou referência à rota antiga em código nem em teste", () => {
    const achados: string[] = [];
    for (const pasta of PASTAS) {
      for (const caminho of arquivos(join(RAIZ, pasta))) {
        const relativo = relative(RAIZ, caminho).split(sep).join("/");
        // Este próprio arquivo cita a rota antiga, e o texto jurídico usa a
        // PALAVRA "gastronomia" em prosa, que não é a rota.
        if (relativo.endsWith("so-existe-uma-rota-de-cardapio.test.ts")) continue;
        /*
         * `trava-alcanca-o-mapa-do-site` cita a rota antiga para AFIRMAR QUE
         * ELA NÃO ESTÁ no mapa do site. É o único lugar onde a lista de rotas é
         * verificada de fato — com o site fechado aos buscadores, o mapa vem
         * vazio no ambiente local. Proibir a menção ali obrigaria a apagar a
         * própria verificação.
         */
        if (relativo.endsWith("trava-alcanca-o-mapa-do-site.test.ts")) continue;
        const texto = semComentarios(readFileSync(caminho, "utf8"));
        if (/\/gastronomia|"gastronomia"|gastronomia:/.test(texto)) {
          achados.push(relativo);
        }
      }
    }
    expect(achados, achados.join("\n")).toEqual([]);
  });
});
