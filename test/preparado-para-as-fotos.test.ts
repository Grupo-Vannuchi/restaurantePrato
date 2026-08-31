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
  it("oferece AVIF antes de WebP", () => {
    // O padrão do Next é só WebP. AVIF costuma ser 20–30% menor na mesma
    // qualidade, e a diferença é maior justamente em foto de comida, que tem
    // gradação suave. O navegador escolhe o primeiro formato que aceita, então
    // a ordem importa.
    expect(CONFIG).toMatch(/formats:\s*\[\s*["']image\/avif["']\s*,\s*["']image\/webp["']/);
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
    ["menu-item-card.tsx", "gastronomia"],
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

  it.each(["galeria", "novidades", "gastronomia"])(
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

  it.each(["galeria", "novidades", "gastronomia"])(
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
