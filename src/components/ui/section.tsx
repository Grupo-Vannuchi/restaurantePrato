import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

/** A vertically-padded page section with an optional anchor id. */
export function Section({
  id,
  className,
  containerClassName,
  children,
}: {
  id?: string;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("scroll-mt-24 py-20 sm:py-section", className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}

/** Standard eyebrow / title / subtitle header used at the top of sections. */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
  titleTone = "default",
}: {
  eyebrow?: string;
  /**
   * O título de exibição da seção. **Opcional desde 25/09/2026.**
   *
   * ⚠️ **Sem ele, quem vira o `<h2>` é o olho** — e isso não é detalhe de
   * estilo. O cliente pediu para tirar o título e o subtítulo da galeria da
   * home; apagar os dois sem mais nada deixaria aquela seção como a única da
   * página sem cabeçalho nenhum, e quem navega por títulos com leitor de tela
   * perderia a galeria do índice.
   *
   * O olho já estava lá, visível, dizendo o que a seção é ("O nosso espaço").
   * Promovê-lo custa zero pixel — ele mantém exatamente as classes que tinha —
   * e devolve o cabeçalho. A regra que fica: **toda seção tem um `<h2>`**; o
   * que varia é se ele aparece em corpo grande ou em versalete.
   *
   * Uma seção sem `title` E sem `eyebrow` fica sem cabeçalho, e aí é escolha
   * explícita de quem chamou.
   */
  title?: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
  /**
   * Cor do título. O padrão é o texto normal; `brand` pinta de verde.
   *
   * ⚠️ **É opção, e não classe solta, de propósito.** Este cabeçalho é usado em
   * seis lugares — home, galeria, depoimentos, experiência, reservas e o
   * cardápio. Uma prop de `className` livre convidaria a pintar qualquer
   * título de qualquer cor, e a paleta deste projeto tem regra: `brand` como
   * TEXTO precisa medir 4,5:1 contra o que estiver atrás, e `accent` nunca
   * serve de texto (1,92:1). Com duas opções nomeadas, só existe um verde
   * possível e ele já foi medido.
   *
   * Onde ele é usado hoje — a vitrine do cardápio na home, sobre `bg-muted/30`
   * — a conta dá **4,84:1**. Ao levá-lo para outra seção, medir de novo: sobre
   * o `muted` puro o mesmo verde cai para 4,52:1, que ainda passa, mas é a
   * margem mais apertada da paleta.
   */
  titleTone?: "default" | "brand";
}) {
  // A classe fica no elemento, então trocar a tag não muda um pixel — mesma
  // decisão do `InformationCard`, que alterna `h2`/`h3` pelo nível recebido.
  const Olho = title ? "span" : "h2";

  return (
    <Reveal
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start",
        className,
      )}
    >
      {/* O olho é `<span>` quando existe um título de exibição para ser o
          `<h2>`, e vira o próprio `<h2>` quando não existe — mesmas classes nos
          dois casos, então a tela não muda. Ver o docblock de `title`. */}
      {eyebrow ? (
        <Olho className="text-sm font-semibold uppercase tracking-widest text-brand">
          {eyebrow}
        </Olho>
      ) : null}
      {title ? (
        <h2
          className={cn(
            "max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-4xl",
            titleTone === "brand" && "text-brand",
          )}
        >
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
          {subtitle}
        </p>
      ) : null}
    </Reveal>
  );
}
