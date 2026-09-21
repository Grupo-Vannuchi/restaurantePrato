import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * O mapa embutido fica fora da ordem de tabulação — e o link equivalente fica.
 *
 * ⚠️ **As duas metades são uma decisão só.** Tirar um elemento do caminho do
 * teclado é, sozinho, uma regressão de acessibilidade. O que torna isto legítimo
 * é existir outro caminho para a mesma coisa: "Traçar rota" e o endereço, os
 * dois abrindo o mapa da Google. Se o link sumir, o `tabIndex` vira defeito.
 *
 * Por que o quadro saiu, em 18/09/2026: ele leva o foco para DENTRO de um
 * iframe de outro domínio — o indicador de foco desaparece de vista e a página
 * de fora não rola atrás dele. Uma linha a mais na página de contato bastou
 * para o quadro terminar acima da janela, com 31 px atrás do cabeçalho fixo:
 * foco num elemento invisível, que é o que o critério 2.4.11 proíbe.
 * `e2e/o-foco-nao-fica-embaixo-do-cabecalho.spec.ts` mede o comportamento; esta
 * guarda protege a DECISÃO, que é a parte que alguém desfaz achando que
 * conserta.
 */
const arquivo = (...partes: string[]) =>
  readFileSync(join(process.cwd(), "src", ...partes), "utf8");

describe("o mapa do rodapé", () => {
  it("está fora da ordem de tabulação", () => {
    expect(
      arquivo("components", "layout", "map-embed.tsx"),
      "o quadro voltou a ser parada de teclado — leia o docblock antes de desfazer",
    ).toMatch(/tabIndex=\{-1\}/);
  });

  it("continua sendo desenhado — não foi removido da página", () => {
    // Sentinela: a guarda acima passaria vacuamente num arquivo sem `<iframe>`.
    expect(arquivo("components", "layout", "map-embed.tsx")).toMatch(/<iframe/);
  });

  it("tem um link equivalente ao lado, que é o que autoriza a decisão", () => {
    // O rodapé monta a URL por `mapLink()`, fonte única desde 18/09.
    const rodape = arquivo("components", "layout", "footer.tsx");
    expect(rodape).toMatch(/mapLink\(\)/);
    expect(rodape).toMatch(/mapsLink/);
  });

  it("e a página de contato também oferece o caminho por link", () => {
    const contato = arquivo("app", "[locale]", "(marketing)", "contato", "page.tsx");
    expect(contato).toMatch(/mapLink\(\)/);
  });
});
