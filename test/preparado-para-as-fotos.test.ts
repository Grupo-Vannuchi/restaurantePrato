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
   * ⚠️ **Esta guarda cobrava AVIF antes de WebP até 15/09, e o que envelheceu
   * foi a JUSTIFICATIVA dela, não a configuração.**
   *
   * O comentário que morava aqui dizia que "AVIF costuma ser 20–30% menor na
   * mesma qualidade, diferença maior justamente em foto de comida". Isso é
   * verdade em geral e falso para os arquivos deste projeto, porque as fontes já
   * são WebP: medido na mesma largura e qualidade, as duas imagens pesadas —
   * que são as que decidem o tempo de pintura — deram **0%**, e duas leves
   * ficaram 5% e 9% MAIORES em AVIF. A tabela está no `next.config.ts`.
   *
   * E o AVIF cobrava: o otimizador do Next **trava indefinidamente** em certas
   * combinações de (arquivo, largura) — sem resposta, sem erro, sem log. A marca
   * do cabeçalho é `priority`, então a requisição pendurada segura o evento
   * `load` e derruba toda medição de navegador na rota. Custou duas tardes.
   *
   * ⚠️ **A guarda estava verde quando o defeito foi introduzido, e vermelha
   * depois do conserto — invertida.** Ela é a quinta deste repositório a afirmar
   * uma previsão em vez de uma medição, e é o mesmo erro que o `AGENTS.md`
   * corrige em dois lugares ("400+ páginas estáticas", "o React Compiler está
   * ligado"): a regra sobrevive, a justificativa inflada não.
   *
   * Agora ela cobra a decisão tomada, e falha nos dois sentidos — se alguém
   * reintroduzir AVIF sem passar pela verificação que o `next.config.ts` exige,
   * isto quebra.
   */
  it("serve só WebP, e não oferece AVIF", () => {
    expect(CONFIG).toMatch(/formats:\s*\[\s*["']image\/webp["']\s*,?\s*\]/);
    expect(CONFIG).not.toMatch(/formats:[^\]]*image\/avif/);
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
