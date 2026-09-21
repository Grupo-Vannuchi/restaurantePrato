import Image from "next/image";

import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Marca do restaurante, com link para a home.
 *
 * A logo chegou em 09/09/2026 e substituiu a marca tipográfica interina — o
 * nome escrito na serifada, que segurou o lugar desde o rebrand. Os arquivos
 * saem de `public/brand`, recortados do PNG entregue pelo cliente.
 *
 * ── As duas variantes, e por que são recortes diferentes ──────────────────
 *
 * O arquivo original é um empilhamento VERTICAL: cozinheiro em cima, "Prato"
 * embaixo, "Restaurante e Café" por último, num quadrado de 2000 px. Usar esse
 * quadrado no cabeçalho seria ilegível — ele tem 64 px de altura, e a linha
 * miúda ficaria com dois pixels.
 *
 *  - `wordmark` (padrão) — só o nome, sem o cozinheiro. Proporção 2,6:1, que é
 *    o que cabe numa faixa baixa. Vai no cabeçalho.
 *  - `lockup` — a marca inteira, onde há altura para ela. Vai no rodapé.
 *  - `lockup-claro` — a mesma, para fundo escuro. Vai na abertura do cardápio.
 *
 * ⚠️ **O fundo branco do arquivo virou transparência com duas regras
 * diferentes, e a diferença é do desenho.** No cozinheiro há branco que é
 * arte — o chapéu, o jaleco, o brilho da cúpula —, então só o branco alcançável
 * a partir da borda foi removido. No nome não há branco de propósito: são
 * letras verdes maciças, e o vazado do "o" e do "a" é fundo que a inundação
 * pela borda nunca alcançaria, porque a própria letra o cerca. Ali todo branco
 * saiu. Com uma regra só, ou o cozinheiro perdia o chapéu ou as letras ficavam
 * com miolo branco sobre o rodapé colorido.
 *
 * O `alt` fica vazio porque o `aria-label` do link já nomeia a marca: com os
 * dois, quem usa leitor de tela ouve o nome do restaurante duas vezes seguidas.
 */
const MARCAS = {
  wordmark: { src: "/brand/wordmark.png", width: 720, height: 280 },
  /*
   * O nome em branco, para faixa de cor. Mesmas dimensoes do `wordmark`.
   *
   * O arquivo existia desde 09/09 e servia so ao cartao de compartilhamento;
   * virou variante em 21/09, quando a abertura do cardapio passou a ser uma
   * faixa verde estreita. Sobre `brand` o nome branco da 4,98:1 — e o
   * `lockup-claro` nao serve aqui: ele e vertical (520x499) e numa faixa de
   * poucos pixels de altura o cozinheiro viraria borrao.
   */
  "wordmark-claro": { src: "/brand/wordmark-claro.png", width: 720, height: 280 },
  lockup: { src: "/brand/logo.png", width: 520, height: 499 },
  /**
   * Para fundo escuro. O nome vem tingido de branco; **o cozinheiro fica nas
   * cores dele**, e essa parte é decisão medida, não descuido.
   *
   * Tingir o conjunto todo de branco transforma o cozinheiro num borrão sem
   * rosto — some o sorriso, o polegar, a gola. Conferi lado a lado sobre fundo
   * escuro antes de escolher. O chapéu e o jaleco já são claros, então ele lê
   * sobre escuro sem ajuste nenhum; quem precisava de tintura era só o nome,
   * que é verde maciço.
   *
   * Mesmas dimensões do `lockup` para a troca não pular layout.
   */
  "lockup-claro": { src: "/brand/logo-claro.png", width: 520, height: 499 },
} as const;

export function Logo({
  className,
  variant = "wordmark",
}: {
  className?: string;
  variant?: "wordmark" | "wordmark-claro" | "lockup" | "lockup-claro";
}) {
  const marca = MARCAS[variant];
  /*
   * ⚠️ **Por PREFIXO, e nao por igualdade — a igualdade era uma armadilha.**
   * Estas duas linhas testavam `variant === "wordmark"`, entao a variante
   * `wordmark-claro`, criada em 21/09/2026, caiu no `else` e recebeu a altura do
   * LOCKUP: 96 px de imagem dentro de uma faixa de 40, com o nome decapitado na
   * tela. Nenhum teste pegou — altura de imagem nao e algo que asercao de
   * renderizacao veja —, e quem pegou foi olhar a pagina.
   *
   * Por prefixo, qualquer `wordmark-*` futuro herda o tamanho certo.
   */
  const ehWordmark = variant.startsWith("wordmark");

  return (
    <Link
      href="/"
      className={cn("inline-flex items-center", className)}
      aria-label={siteConfig.name}
    >
      <Image
        src={marca.src}
        alt=""
        width={marca.width}
        height={marca.height}
        /*
         * ⚠️ **`sizes` é obrigatório aqui, e a falta dele custava caro em dois
         * lugares ao mesmo tempo.**
         *
         * `width`/`height` só declaram a PROPORÇÃO — o tamanho na tela vem do
         * CSS abaixo (`h-10`, `h-24`, com `w-auto`). Sem `sizes`, o Next monta a
         * lista de variantes a partir da largura DECLARADA, oferecendo 1× e 2×
         * dela. Medido no Pixel 7 (densidade 2,625):
         *
         *   marca do cabeçalho .... 103×40 na tela, declarava 720×280, baixava w=1920
         *   logo do rodapé ........ 100×96 na tela, declarava 520×499, baixava w=1080
         *
         * Uma variante de 1920 px para um espaço de 103. E a segunda dose:
         * `logo-claro.png` pedida em 1080 — acima dos 520 do arquivo — **travava
         * o otimizador**, deterministicamente, 3 de 3 com cache frio. Como ela é
         * `priority` (não é tardia), o evento `load` da página nunca chegava, e
         * com ele foram dezesseis testes do tamanho celular em `/cardapio`.
         *
         * Não é o encoder: o `sharp` converte os dois arquivos em 1,3 s. Não é o
         * arquivo: `logo.png` e `logo-claro.png` são idênticos em dimensão,
         * canais, profundidade, espaço de cor e alfa. É a AMPLIAÇÃO que o
         * otimizador não digere nesse caso — e ninguém precisava dela.
         *
         * Com `sizes`, a escolha passa a ser por largura real: 120 px × 2,625
         * dá 315, o navegador pega o balde de 384, e nenhuma ampliação é pedida.
         */
        sizes={ehWordmark ? "120px" : "104px"}
        /* A marca do cabeçalho aparece em toda página e no primeiro quadro:
           carregá-la com prioridade evita o pulo de layout que uma imagem
           preguiçosa causaria bem no topo. */
        priority
        className={cn(
          "w-auto object-contain",
          ehWordmark ? "h-10 sm:h-11" : "h-24",
        )}
      />
    </Link>
  );
}
