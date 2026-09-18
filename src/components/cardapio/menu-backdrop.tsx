/**
 * O fundo do cardápio digital: um banho de papel quente.
 *
 * Pedido do cliente em 18/09/2026: deixar `/cardapio` no mesmo formato do
 * projeto irmão. A primeira tentativa do mesmo dia foi um verde escuro tirado da
 * paleta, e o cliente respondeu que **ficou verde demais** e pediu "algo mais
 * natural" — mantendo a estrutura, isto é, onde cada coisa fica.
 *
 * Então o que mudou foi só o TOM. O irmão passou pelo mesmo caminho na direção
 * oposta: a v15 de lá é papel kraft, e chegou lá depois de um ciclo de fundos
 * escuros.
 *
 * ── As três lições herdadas do irmão, que continuam mandando ──────────────
 *
 * O arquivo equivalente de lá documenta DEZESSEIS versões. Não vale repetir o
 * percurso; vale herdar o que cada uma custou:
 *
 * **1. Nada de forma reconhecível.** Toda versão com contorno para o olho
 * apontar — círculo, faixa, fita, chama — foi derrubada com alguma variação de
 * "parece uma mancha". Sobrou um degradê radial simples, mais largo que alto,
 * que não desenha borda nenhuma.
 *
 * **2. Porcentagem, nunca pixel.** Forma de tamanho fixo pede calibração por
 * largura de tela. Tudo aqui é `%` da própria caixa, então a proporção não muda
 * com a tela.
 *
 * **3. O centro fica DESLOCADO** (`42% 38%`). Centralizado, o degradê vira um
 * alvo simétrico — que é a lição 1 entrando pela porta dos fundos.
 *
 * ── Por que o texto voltou a ser escuro ───────────────────────────────────
 *
 * Na versão verde, título e subtítulo precisavam de cor própria e clara, porque
 * os tokens do tema foram medidos contra o creme do site. Com o fundo claro isso
 * se inverte: os tokens voltam a servir, e a máquina de variáveis CSS que a
 * versão verde exigia saiu junto — menos peça para manter.
 *
 * ⚠️ **E é isso que cria o risco que a guarda cobre.** Escurecer estes três tons
 * é uma linha de trabalho; o texto degradando com eles é silencioso. Medido
 * contra o tom MAIS ESCURO (`BORDA`), que é o pior caso para texto escuro:
 *
 *   `foreground`        #0C0C0C   13,40:1   ✅
 *   `muted-foreground`  #565c4e    4,74:1   ✅ (o mínimo é 4,5 — a folga é fina)
 *   `brand`             #607827    3,41:1   ❌ — brand NÃO serve de texto aqui
 *
 * `test/o-fundo-do-cardapio-deixa-o-texto-legivel.test.ts` refaz essa conta a
 * partir destas constantes e das cores de `siteConfig`, e reprova se alguém
 * mexer num lado sem mexer no outro. É por isso que os três tons são exportados.
 *
 * ⚠️ O tom mais escuro também é o que separa o fundo dos CARTÕES: as listas de
 * prato são `bg-card` (#FAFBF7), e um fundo claro demais faria os cartões
 * desaparecerem nele — o empilhamento é o que dá estrutura à página.
 */

/** O ponto mais claro, no centro deslocado do degradê. */
export const CENTRO = "#F4EFE3";
/** O tom intermediário. */
export const MEIO = "#EBE4D4";
/**
 * O tom mais escuro, nas pontas — e o que governa a legibilidade do texto
 * escuro que cai solto sobre o fundo. Ver a conta no topo do arquivo.
 */
export const BORDA = "#DED5C0";

export function MenuBackdrop() {
  return (
    <div
      aria-hidden
      /*
       * `fixed` e não `absolute`: o banho fica parado enquanto a página rola,
       * então não repete nem emenda numa página tão longa quanto esta — são 98
       * pratos em cinco abas. `-z-10` o põe atrás do conteúdo sem exigir
       * `z-index` em nada que venha por cima.
       *
       * ⚠️ **`-z-10` é também o que mantém a varredura de contraste medindo.**
       * O veto de sobrepostos fixos dela ignora `z-index` negativo justamente
       * porque um fundo não pode cobrir texto; com `z-index` positivo, um
       * elemento de tela inteira faria a varredura vetar cada ponto da grade e
       * aprovar sem medir nada. Já aconteceu, em 18/09.
       *
       * `pointer-events-none` porque um elemento de tela inteira capturaria
       * clique, e este não tem o que receber.
       */
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundColor: BORDA,
        backgroundImage: `radial-gradient(120% 95% at 42% 38%, ${CENTRO} 0%, ${MEIO} 45%, ${BORDA} 100%)`,
      }}
    />
  );
}
