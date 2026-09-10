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
  variant?: "wordmark" | "lockup" | "lockup-claro";
}) {
  const marca = MARCAS[variant];

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
        /* A marca do cabeçalho aparece em toda página e no primeiro quadro:
           carregá-la com prioridade evita o pulo de layout que uma imagem
           preguiçosa causaria bem no topo. */
        priority
        className={cn(
          "w-auto object-contain",
          variant === "wordmark" ? "h-10 sm:h-11" : "h-24",
        )}
      />
    </Link>
  );
}
