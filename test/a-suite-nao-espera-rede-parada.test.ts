import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Nenhum spec espera por "rede parada" — a espera que nunca chega.
 *
 * `waitUntil: "networkidle"` exige 500 ms sem NENHUMA conexão pendente. Uma
 * única requisição que não termina trava a espera para sempre, e o teste morre
 * por tempo esgotado sem nunca examinar o que ele existe para examinar.
 *
 * ⚠️ **Medido em 14/09, `/cardapio` no tamanho de celular, contra build de
 * produção:**
 *
 *   domcontentloaded ....... 60 ms
 *   load .................. 238 ms
 *   networkidle ........... ESTOUROU em 40 s
 *
 * A causa é uma foto tardia (`loading="lazy"`) fora da tela, no carrossel de
 * massas: o navegador começa o pedido e não o conclui, porque nada a trouxe
 * para a vista. Isso é comportamento normal de carregamento tardio — não é
 * defeito do site, e foi verificado: as oito fotos respondem 200 em menos de
 * 1,1 s a frio e em paralelo, e a tela mostra os slides.
 *
 * O custo era NOVE testes do tamanho celular estourando o tempo, todos em
 * `/cardapio`. Nenhum deles estava medindo rede: mediam contraste, títulos,
 * refluxo, foco e CSP.
 *
 * **`load` é a pergunta certa para abrir uma página.** Ele espera o que a página
 * precisa para se desenhar — folha de estilo, fontes, as imagens que não são
 * tardias — e não fica preso ao que o navegador decidiu adiar. A documentação do
 * próprio Playwright desaconselha `networkidle`.
 *
 * ⚠️ **Quando a espera precisa MESMO de rede, espere SILÊNCIO e não zero.** O
 * orçamento de imagem em `e2e/performance.spec.ts` rola até o fim da página para
 * contar as fotos de baixo da dobra, e ali a espera faz trabalho de verdade: ele
 * aguarda 800 ms sem resposta de imagem, com teto de 15 s. Byte que nunca chega
 * também não é byte que o visitante pagou, então uma requisição pendurada sai da
 * conta em vez de derrubar o teste.
 */

/**
 * A fonte SEM comentários.
 *
 * ⚠️ Não é zelo: esta guarda proíbe uma palavra que os comentários de dois specs
 * precisam CITAR para explicar por que ela é proibida. É a quarta vez que este
 * repositório escorrega nisso — a guarda do `<aside>`, a do modal, a do
 * `startTransition` e a de cor translúcida caíram todas aqui.
 */
const semComentarios = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("a suíte não espera por rede parada", () => {
  const specs = readdirSync("e2e").filter((f) => f.endsWith(".ts"));

  it("nenhum spec usa networkidle", () => {
    // Sentinela: pasta vazia, ou renomeada, passaria sem examinar nada.
    expect(specs.length, "nenhum arquivo encontrado em e2e/").toBeGreaterThan(10);

    const infratores = specs.filter((f) =>
      semComentarios(readFileSync(`e2e/${f}`, "utf8")).includes("networkidle"),
    );

    expect(
      infratores,
      `Estes specs esperam por rede parada: ${infratores.join(", ")}. Use ` +
        `\`waitUntil: "load"\` para abrir a página — medido, 238 ms contra 40 s de ` +
        `estouro em /cardapio no celular. Se a sua espera precisa mesmo de rede, ` +
        `espere SILÊNCIO (nenhuma resposta por um período, com teto), como o ` +
        `orçamento de imagem faz: rede parada exige ZERO pendentes, e uma foto ` +
        `tardia fora da tela nunca termina.`,
    ).toEqual([]);
  });

  it("as aberturas de página usam load", () => {
    /*
     * O outro lado. Sem isto, "cumprir" o teste acima é possível trocando tudo
     * por `domcontentloaded` — que volta 178 ms mais rápido e não espera folha
     * de estilo nem fonte nem imagem alguma. As guardas de contraste medem
     * PIXEL: medir antes de a foto chegar mede o degradê de trás.
     */
    const comAbertura = specs.filter((f) =>
      semComentarios(readFileSync(`e2e/${f}`, "utf8")).includes("waitUntil:"),
    );
    expect(
      comAbertura.length,
      "nenhum spec declara waitUntil: a varredura não está examinando nada",
    ).toBeGreaterThan(8);

    const frouxos = comAbertura.filter((f) => {
      const fonte = semComentarios(readFileSync(`e2e/${f}`, "utf8"));
      // `domcontentloaded` é legítimo para quem só lê o HTML do servidor — o
      // spec sem JavaScript é o caso. O que ele não pode ser é a espera de quem
      // mede pixel, e esses specs importam o medidor de contraste.
      return (
        fonte.includes('waitUntil: "domcontentloaded"') &&
        fonte.includes("./contraste")
      );
    });

    expect(
      frouxos,
      `Estes specs medem pixel mas abrem a página com domcontentloaded: ` +
        `${frouxos.join(", ")}. Sem esperar \`load\`, a medição pode acontecer ` +
        `antes de a fotografia de fundo chegar — e aí ela mede o degradê que está ` +
        `atrás dela, não o composto que o visitante vê.`,
    ).toEqual([]);
  });
});
