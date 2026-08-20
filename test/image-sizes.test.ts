import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Toda imagem que ocupa largura variável precisa declarar `sizes`.
 *
 * Sem esse atributo o navegador assume que a imagem ocupa a largura inteira da
 * janela e escolhe, do conjunto que o Next gera, o arquivo desse tamanho. Num
 * grid de três colunas isso é três vezes mais bytes do que o necessário — em
 * cada foto, em cada visita, e principalmente no celular, onde a conta de
 * dados é do visitante.
 *
 * O defeito não aparece hoje: o banco está vazio e nenhuma foto é servida.
 * Aparece no dia em que a galeria e o cardápio forem cadastrados — que é
 * exatamente quando ninguém vai estar olhando para isto.
 */
const COM_LARGURA_VARIAVEL = [
  "src/components/gallery-photo-card.tsx",
  "src/components/menu-item-card.tsx",
  "src/components/information-card.tsx",
  "src/components/sections/hero-carousel.tsx",
];

describe("imagens responsivas", () => {
  it.each(COM_LARGURA_VARIAVEL)("%s declara sizes", (arquivo) => {
    const fonte = readFileSync(join(process.cwd(), arquivo), "utf8");
    expect(fonte).toContain("<Image");
    expect(fonte).toMatch(/sizes=/);
  });

  it("o avatar de depoimento fica de fora, e de propósito", () => {
    // 44×44 fixos: o arquivo servido é o mesmo em qualquer tela, então `sizes`
    // não teria o que escolher. Está aqui para a exceção ser deliberada, e não
    // um esquecimento que a próxima pessoa "conserta".
    const fonte = readFileSync(
      join(process.cwd(), "src/components/sections/testimonials.tsx"),
      "utf8",
    );
    expect(fonte).toMatch(/width=\{44\}/);
  });
});
