/**
 * O fundo verde do cardápio digital.
 *
 * Pedido do cliente em 18/09/2026: deixar `/cardapio` no mesmo formato do
 * projeto irmão, com fundo verde. Lá o fundo é terracota, amostrado da arte
 * impressa daquele cliente; aqui o verde vem da paleta entregue em 26/08, que é
 * o equivalente honesto — não é cor escolhida no olho, é a cor da marca.
 *
 * ── As três lições que vieram de lá, e por que elas mandam aqui ───────────
 *
 * O arquivo equivalente do irmão documenta DEZESSEIS versões. Não vale repetir
 * o percurso; vale herdar o que cada uma custou:
 *
 * **1. Nada de forma reconhecível.** Toda versão que tinha contorno para o olho
 * apontar — círculo, faixa, fita, chama — foi derrubada com alguma variação de
 * "parece uma mancha". O que sobreviveu foi um degradê radial simples, mais
 * largo que alto, que não desenha borda nenhuma: só esquenta o centro e esfria
 * para as pontas.
 *
 * **2. Porcentagem, nunca pixel.** As versões com forma de tamanho fixo pediam
 * calibração por largura de tela (420px → 260px → 180px, cada aperto medido em
 * retrato), porque a mesma forma ou sumia ou invadia a coluna de leitura. Tudo
 * aqui é `%` da própria caixa: a proporção não muda com a tela, e por isso esta
 * versão não herda aquela calibração.
 *
 * **3. Texto solto precisa de cor PRÓPRIA, sólida.** Os tokens do tema foram
 * medidos contra o creme do site, não contra verde — usá-los aqui seria medir
 * uma tela que não existe. E a cor é sólida, não o título com `opacity`: sobre
 * fundo de tom médio a opacidade come o contraste rápido demais.
 *
 * ── O degradê, e por que estes três verdes ────────────────────────────────
 *
 * O ponto MAIS CLARO é o que governa o contraste do texto claro, então ele é
 * quem foi escolhido primeiro. Medido com o helper de `e2e/contraste.ts`:
 *
 *              hex        branco   `TEXTO_SOLTO_APOIO`
 *   centro   #50641F       6,60       5,25
 *   meio     #42521A       8,56       6,81
 *   borda    #334014      11,15       8,86
 *
 * ⚠️ **O brand `#607827` foi testado como centro e REPROVADO — por pouco, e é o
 * "por pouco" que importa.** Ele dá 4,98 com branco, que passa; mas aí não
 * sobra folga nenhuma para um segundo tom de apoio: o melhor candidato de
 * subtítulo fica em 4,49, abaixo do mínimo. Escurecer o centro é o que compra
 * hierarquia — título e subtítulo com cores diferentes, ambos acima de 4,5.
 *
 * O centro fica DESLOCADO (`42% 38%`) de propósito: centralizado, o degradê
 * vira um alvo simétrico, que é a "forma reconhecível" da lição 1 entrando pela
 * porta dos fundos.
 */

/**
 * O branco da paleta do cliente, para o texto que cai solto sobre o fundo.
 * 6,60:1 no pior ponto do degradê.
 */
export const TEXTO_SOLTO = "#FFFFFF";

/**
 * O tom de apoio — subtítulo e texto secundário sobre o fundo. 5,25:1 no pior
 * ponto. Um degrau abaixo do branco e ainda com folga sobre o mínimo.
 *
 * ⚠️ É COR, não `opacity` sobre o branco. Ver a lição 3 acima.
 */
export const TEXTO_SOLTO_APOIO = "#E3E8CE";

const CENTRO = "#50641F";
const MEIO = "#42521A";
const BORDA = "#334014";

export function MenuBackdrop() {
  return (
    <div
      aria-hidden
      /*
       * `fixed` e não `absolute`: o degradê fica parado enquanto a página rola,
       * então ele não repete nem emenda numa página tão longa quanto esta — são
       * 98 pratos em cinco abas. `-z-10` o põe atrás do conteúdo sem exigir
       * `z-index` em nada que venha por cima.
       *
       * `pointer-events-none` porque um elemento de tela inteira por cima de
       * tudo capturaria clique — e este não tem o que receber.
       */
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundColor: BORDA,
        backgroundImage: `radial-gradient(120% 95% at 42% 38%, ${CENTRO} 0%, ${MEIO} 45%, ${BORDA} 100%)`,
      }}
    />
  );
}
