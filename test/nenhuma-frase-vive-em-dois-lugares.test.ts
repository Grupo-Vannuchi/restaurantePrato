import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Nenhuma frase longa do catálogo existe duas vezes — copy duplicada diverge.
 *
 * ⚠️ **A guarda nasceu de um caso concreto do projeto irmão.** Lá os três
 * momentos do salão (cedo, pico, depois do pico) existem em dois namespaces
 * separados, `experiencia.timing` e `reservas.bestTime`, com textos parecidos e
 * independentes. No dia em que o cliente mudar o horário de pico, uma das duas
 * fica para trás — e ninguém sabe qual das duas o visitante leu.
 *
 * Quando esse bloco veio para cá, em 11/09, ele veio com fonte ÚNICA: as seis
 * frases vivem no namespace `salao`, e `/reservas` e `/experiencia` renderizam a
 * mesma lista em layouts diferentes. Este teste é o que impede a próxima pessoa
 * de "resolver" um pedido de texto diferente numa das páginas colando as frases
 * na outra namespace.
 *
 * ⚠️ **O corte é o TAMANHO, e não é arbitrário.** Rótulo curto se repete por
 * boa razão: "Contato" é item de menu e também título de coluna do rodapé,
 * "E-mail" é rótulo em dois lugares, e forçar uma fonte única para cada palavra
 * criaria um namespace de fragmentos que ninguém consegue ler. O que não pode
 * repetir é FRASE: a partir de 60 caracteres, duas cópias são duas coisas para
 * manter, e a segunda existe justamente para divergir da primeira.
 *
 * Se um dia duas páginas precisarem de textos DIFERENTES para a mesma ideia,
 * isso é legítimo e passa aqui sozinho — são frases diferentes. O que a guarda
 * recusa é a cópia literal.
 */
const MINIMO_DE_FRASE = 60;

type Par = [string, string];

/** Achata o catálogo em pares chave → texto, incluindo itens de lista. */
function pares(objeto: Record<string, unknown>, prefixo = ""): Par[] {
  return Object.entries(objeto).flatMap(([chave, valor]): Par[] => {
    const caminho = prefixo + chave;
    if (Array.isArray(valor)) {
      return valor.map((item, i): Par => [`${caminho}[${i}]`, String(item)]);
    }
    if (typeof valor === "object" && valor !== null) {
      return pares(valor as Record<string, unknown>, `${caminho}.`);
    }
    return [[caminho, String(valor)]];
  });
}

describe("nenhuma frase vive em dois lugares", () => {
  const catalogo = pares(
    JSON.parse(readFileSync("src/messages/pt.json", "utf8")) as Record<string, unknown>,
  );

  it("o catálogo não tem frase longa repetida", () => {
    // Sentinela: catálogo vazio ou com poucas entradas não provaria nada.
    expect(catalogo.length, "o catálogo tem pouca coisa para varrer").toBeGreaterThan(300);
    const longas = catalogo.filter(([, v]) => v.trim().length >= MINIMO_DE_FRASE);
    expect(
      longas.length,
      `nenhuma frase com ${MINIMO_DE_FRASE}+ caracteres no catálogo`,
    ).toBeGreaterThan(30);

    const porTexto = new Map<string, string[]>();
    for (const [chave, valor] of longas) {
      const texto = valor.trim();
      porTexto.set(texto, [...(porTexto.get(texto) ?? []), chave]);
    }

    const repetidas = [...porTexto]
      .filter(([, chaves]) => chaves.length > 1)
      .map(([texto, chaves]) => `${chaves.join(" + ")} → "${texto.slice(0, 60)}…"`);

    expect(
      repetidas,
      `Frase longa em mais de uma chave:\n  ${repetidas.join("\n  ")}\n` +
        `Duas cópias da mesma frase são duas coisas para manter, e a segunda ` +
        `existe para divergir da primeira. Se as duas páginas mostram a mesma ` +
        `coisa, extraia um componente que leia UMA chave — foi o que ` +
        `\`components/sections/momentos-do-salao.tsx\` faz.`,
    ).toEqual([]);
  });

  it("os momentos do salão são renderizados pelo componente nas duas páginas", () => {
    /*
     * O outro lado: a fonte única só vale se as duas páginas de fato usarem o
     * componente. Sem esta asserção, "cumprir" o teste acima é possível
     * apagando o bloco de uma das páginas — e aí a Experiência volta a ser a
     * página magra que ele veio preencher.
     */
    for (const caminho of [
      "src/app/[locale]/(marketing)/reservas/page.tsx",
      "src/app/[locale]/(marketing)/experiencia/page.tsx",
    ]) {
      const fonte = readFileSync(caminho, "utf8");
      expect(
        fonte.includes("<MomentosDoSalao />"),
        `${caminho} deixou de mostrar os momentos do salão`,
      ).toBe(true);
    }
  });
});
