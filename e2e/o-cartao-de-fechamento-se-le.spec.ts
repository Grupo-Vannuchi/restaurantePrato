import { expect, test } from "@playwright/test";

import { contrasteNaTela } from "./contraste";

/**
 * O texto do cartão de fechamento se lê sobre o verde da marca.
 *
 * O cartão é `bg-brand` com `text-brand-foreground` — branco sobre #607827, que
 * a paleta garante em 4,98:1. **Só que nenhum dos dois textos chega à tela
 * assim**, e por dois motivos diferentes:
 *
 * - o corpo é `opacity-90`, então a tinta é branco a 90%, não branco
 * - o cartão tem um borrão decorativo `bg-white/10 blur-2xl` no canto superior
 *   direito, que CLAREIA o fundo — e fundo mais claro com texto branco significa
 *   contraste MENOR, não maior
 *
 * A folga entre 4,98 e o mínimo de 4,5 é de 10%, e cada um dos dois come uma
 * parte dela.
 *
 * ⚠️ **Esta guarda só pôde existir depois de consertar o medidor.** A versão
 * anterior de `contraste.ts` lia a cor computada do texto, que é sempre a cor
 * OPACA: num `opacity-90` branco ela respondia branco puro e devolvia 4,98:1 —
 * o número da paleta, não o da tela. O defeito ficaria invisível exatamente
 * para a guarda escrita para achá-lo. Agora a opacidade efetiva (a do elemento,
 * a dos ancestrais e a do alfa da cor) é composta sobre cada pixel do fundo.
 *
 * ⚠️ **Recorte `so-onde-ha-letra`, por causa do borrão.** O texto é centralizado
 * dentro de um bloco mais largo que as linhas; medindo a caixa inteira, o borrão
 * do canto entraria na conta mesmo quando não há letra nenhuma embaixo dele, e a
 * guarda acusaria um defeito que ninguém vê. O retângulo dos glifos é onde a
 * pergunta tem sentido.
 */
const MINIMO_AA = 4.5;

/**
 * O cartão é o único `div` com `bg-brand` de fundo próprio nas duas páginas —
 * os outros usos da cor são `span` (o marcador do carrossel) e `a`/`button`
 * (os botões). A contagem é conferida no teste, para o seletor não passar a
 * medir outra coisa em silêncio.
 */
const CARTAO = "div.bg-brand";

const PAGINAS = [
  { rota: "/", nome: "o cartão de fechamento da home" },
  { rota: "/experiencia", nome: "o cartão de fechamento da Experiência" },
];

for (const { rota, nome } of PAGINAS) {
  test(`${nome} se lê sobre o verde`, async ({ page }) => {
    await page.goto(rota, { waitUntil: "load" });

    const cartao = page.locator(CARTAO);
    expect(
      await cartao.count(),
      `esperava exatamente um cartão de fechamento em ${rota}`,
    ).toBe(1);

    /*
     * O título e cada parágrafo do corpo. Os parágrafos são medidos um a um
     * porque `/experiencia` tem três, e um deles pode ser mais curto e cair
     * inteiro sob o borrão enquanto os outros escapam.
     */
    const alvos = [cartao.locator("h2"), ...(await cartao.locator("p").all())];
    expect(alvos.length, `nenhum texto medido em ${rota}`).toBeGreaterThan(1);

    for (const [i, alvo] of alvos.entries()) {
      const qual = i === 0 ? "o título" : `o parágrafo ${i}`;
      const texto = ((await alvo.textContent()) ?? "").trim().slice(0, 40);

      const { pior, largura } = await contrasteNaTela(
        page,
        alvo,
        "esconde-o-texto",
        "so-onde-ha-letra",
      );

      // Sentinela: um alvo de 0 px passaria a varredura sem examinar pixel nenhum.
      expect(largura, `${qual} de ${rota} não tem largura`).toBeGreaterThan(40);

      expect(
        pior,
        `${nome}: ${qual} ("${texto}…") tem ${pior.toFixed(2)}:1 no pior pixel, ` +
          `abaixo dos ${MINIMO_AA}:1 da WCAG AA. O cartão é branco sobre o verde da ` +
          `marca, que sozinho dá 4,98:1 — a folga de 10% é comida por \`opacity-90\` ` +
          `no corpo e pelo borrão \`bg-white/10\` do canto, que clareia o fundo. ` +
          `Arquivos: src/components/sections/closing-cta.tsx e quem passa o corpo ` +
          `(src/components/sections/cta.tsx, (marketing)/experiencia/page.tsx).`,
      ).toBeGreaterThanOrEqual(MINIMO_AA);
    }
  });
}
