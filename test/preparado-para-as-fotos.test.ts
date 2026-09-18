import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { iconNames } from "@/components/ui/icon";

/**
 * Quatro coisas que só cobram o preço no dia em que as fotos entrarem.
 *
 * Hoje o site não serve imagem nenhuma — o banco está vazio e o topo cai num
 * degradê. Todos os defeitos abaixo são latentes, e é exatamente por isso que
 * eles precisam de guarda: no dia em que as fotos chegarem, ninguém vai estar
 * medindo, e a lentidão vai parecer "culpa das fotos".
 */
const CONFIG = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
const LAYOUT = readFileSync(
  join(process.cwd(), "src", "app", "[locale]", "layout.tsx"),
  "utf8",
);

describe("o formato das imagens", () => {
  /**
   * ⚠️ **Esta guarda trocou de lado TRÊS vezes, e é o histórico que importa —
   * não a versão da semana.**
   *
   * · até 15/09 cobrava AVIF antes de WebP, com a justificativa "AVIF costuma
   *   ser 20–30% menor, e mais ainda em foto de comida". Previsão, não medição.
   * · em 15/09 passou a cobrar SÓ WebP, porque mediu-se 0% de economia e um
   *   travamento do otimizador. Medição de verdade — mas na qualidade errada.
   * · em 18/09 voltou a cobrar AVIF, porque as DUAS razões de 15/09 caíram.
   *
   * **Por que caíram**, e é isso que impede a quarta reviravolta:
   *
   * 1. Os 0% foram medidos em **q=75**. Este projeto serve as fotos em **q=50**
   *    — cinco superfícies declaram `quality={50}` — e ali o AVIF é 2 a 2,8
   *    vezes menor. Medido pelo otimizador, e depois no peso real por página:
   *    `/galeria` cai de 16.723 KB para 8.215 KB.
   * 2. O travamento **não é do AVIF**. Em 18/09 ele foi reproduzido no caminho
   *    WebP, com o AVIF desligado, e a causa é em memória: uma otimização em
   *    voo abortada deixa a chave pendurada no mapa de deduplicação do
   *    otimizador. Reiniciar o servidor limpa. Manter o AVIF desligado nunca
   *    protegeu de nada.
   *
   * A condição de reabertura que o `next.config.ts` exigia foi cumprida e está
   * registrada lá: as 5 imagens de `public/brand` × 8 larguras, com
   * `Accept: image/avif` e cache frio, 40 requisições e nenhuma pendurada —
   * incluindo as duas que travaram em 15/09.
   *
   * ⚠️ **A ordem é cobrada, não só a presença.** O navegador escolhe o PRIMEIRO
   * formato que aceita: com WebP na frente, todo navegador moderno recebe WebP e
   * o AVIF não serve para nada — uma configuração que parece ligada e não é.
   *
   * ⚠️ E o projeto irmão, que o cliente pediu como referência, tem AVIF ligado.
   * Mas ele não ganha nada com isso: não declara `images.qualities`, então todo
   * `quality` é ignorado e tudo sai em q=75, exatamente onde os dois empatam.
   */
  it("oferece AVIF antes de WebP", () => {
    expect(CONFIG).toMatch(
      /formats:\s*\[\s*["']image\/avif["']\s*,\s*["']image\/webp["']/,
    );
  });

  it("declara as qualidades que os componentes pedem — senão o AVIF não rende", () => {
    /*
     * O elo que liga uma coisa à outra, e que não é óbvio: o ganho do AVIF
     * existe em q=50, e `quality={50}` só chega ao otimizador se 50 estiver em
     * `images.qualities`. Sem a lista, o Next usa `[75]` e a URL sai `q=75`
     * calada — sem erro, sem aviso. Foi assim que o irmão ficou com AVIF ligado
     * e sem benefício, e foi assim que este projeto perdeu duas rodadas de
     * medição em 04/09.
     *
     * `test/qualidade-de-imagem-declarada.test.ts` cobre o outro lado (todo
     * valor pedido por componente está na lista). Aqui se cobra que o 50 exista,
     * porque é dele que o AVIF depende.
     */
    expect(CONFIG).toMatch(/qualities:\s*\[[^\]]*\b50\b/);
  });

  it("continua declarando algum formato — senão o padrão do Next volta calado", () => {
    // Sem a chave, o Next assume o padrão dele. A guarda acima passaria
    // vacuamente na ausência de `formats`, e é isso que esta sentinela impede.
    expect(CONFIG).toMatch(/formats:\s*\[/);
  });
});

describe("a conexão com o servidor de imagens", () => {
  it("é aberta antes de a primeira foto ser pedida", () => {
    // Toda imagem do painel vem do Supabase, que é outro domínio. Sem
    // `preconnect`, a primeira foto paga DNS + TCP + TLS DENTRO do caminho
    // crítico — e a primeira foto costuma ser o maior elemento da página.
    expect(LAYOUT).toMatch(/rel="preconnect"/);
    expect(LAYOUT).toMatch(/supabase/i);
  });
});

describe("a primeira imagem de cada listagem", () => {
  const cartao = (nome: string) =>
    readFileSync(join(process.cwd(), "src", "components", nome), "utf8");

  it.each([
    ["gallery-photo-card.tsx", "galeria"],
    ["information-card.tsx", "novidades"],
    ["menu-item-card.tsx", "vitrine da home"],
  ])("%s aceita ser marcada como prioritária", (arquivo) => {
    // Sem `priority`, `next/image` marca tudo como preguiçoso: o navegador só
    // descobre a imagem depois de baixar e aplicar o CSS. Na primeira foto de
    // uma listagem — que é o maior elemento da tela — isso é atraso puro.
    expect(cartao(arquivo)).toMatch(/priority/);
  });

  const pagina = (nome: string) =>
    readFileSync(
      join(process.cwd(), "src", "app", "[locale]", "(marketing)", nome, "page.tsx"),
      "utf8",
    );

  it.each(["galeria", "novidades"])(
    "a página de %s trata a primeira à parte, e só ela",
    (nome) => {
      const fonte = pagina(nome);
      // A primeira sai da revelação E ganha prioridade. O `i === 0` é o que
      // garante "só a primeira": marcar todas faria as fotos disputarem banda.
      expect(fonte).toMatch(/i === 0 \? \(/);
      // `priority` em qualquer posição da tag, e não como último atributo: o
      // padrão antigo (`priority\s*\/?>`) quebrou em 31/08 quando o card de
      // novidades ganhou um `headingLevel` depois dele. A guarda cobra que a
      // prioridade EXISTA, não a ordem em que foi escrita.
      expect(fonte).toMatch(/\bpriority\b/);
      // E que seja só uma: marcar todas faria as fotos disputarem banda.
      //
      // ⚠️ Sem comentários na contagem: `galeria/page.tsx` explica a decisão
      // numa linha logo acima da tag, e a primeira versão desta contagem achou
      // dois. É a quinta guarda deste projeto a tropeçar na própria
      // documentação — comentário descreve o padrão, código é que o aplica.
      const codigo = fonte
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
        .replace(/\/\/.*$/gm, "");
      expect(codigo.match(/\bpriority\b/g)).toHaveLength(1);
    },
  );

  it.each(["galeria", "novidades"])(
    "a página de %s não esconde a primeira atrás da hidratação",
    (nome) => {
      // Marcar como prioritária e deixar dentro de `Reveal` seria meia
      // correção: o navegador baixaria cedo uma imagem que só fica visível
      // depois de hidratar, e o LCP não conta elemento transparente.
      const fonte = pagina(nome);
      const primeiro = fonte.slice(fonte.indexOf("i === 0 ? ("), fonte.indexOf(") : ("));
      expect(primeiro).not.toMatch(/<Reveal/);
    },
  );
});

describe("os ícones oferecidos para as novidades", () => {
  it("não carrega o catálogo de serviços da agência", () => {
    // O mapa vinha do site da agência de onde este projeto foi forkado: são 21
    // ícones embarcados em TODA página pública, por serem um `Record` estático
    // (não há o que remover na compilação), para desenhar de zero a quatro.
    //
    // E o conteúdo delatava a origem: um restaurante não publica novidade com
    // ícone de robô, fluxo de trabalho, impressora ou métrica de campanha.
    const daAgencia = [
      "Palette", "Megaphone", "TrendingUp", "Target", "FileSearchIcon",
      "Cpu", "Share2", "Bot", "Globe", "Workflow", "Printer", "Video",
    ];

    expect(iconNames.filter((n) => daAgencia.includes(n))).toEqual([]);
  });

  it("continua oferecendo escolha suficiente — senão a guarda quebrou o painel", () => {
    expect(iconNames.length).toBeGreaterThanOrEqual(6);
  });
});
