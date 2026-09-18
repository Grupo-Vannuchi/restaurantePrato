import { Container } from "@/components/ui/container";

/**
 * Uma seção do cardápio digital, sobre o fundo verde.
 *
 * Existe em vez de `Section` + `SectionHeader` por uma razão só, e ela é de
 * cor: aqui o título e o subtítulo caem SOLTOS sobre o fundo, fora de qualquer
 * `bg-card`, e os tokens do tema (`text-foreground`, `text-muted-foreground`)
 * foram medidos contra o creme do site. Sobre verde escuro eles viram texto
 * escuro sobre fundo escuro. As duas cores daqui vêm de `menu-backdrop.tsx`,
 * onde estão medidas contra o ponto mais claro do degradê.
 *
 * ⚠️ **Sem `border-t` e sem `bg-muted/30`**, que é como as seções desta página
 * se separavam antes. Sobre o degradê, uma faixa de fundo translúcido desenha
 * exatamente a "forma reconhecível" que o fundo foi feito para não ter — e a
 * borda vira um risco claro no meio do verde. Quem separa as seções agora é o
 * espaço e a mudança de cor do título; quem dá superfície ao conteúdo são os
 * cartões (`bg-card`) que já existem dentro de cada lista.
 *
 * A coluna segue `max-w-3xl`: cardápio se lê de cima a baixo, não se varre em
 * grade, e a medida mantém a linha na faixa confortável mesmo num monitor
 * largo.
 */
export function MenuSection({
  id,
  title,
  subtitle,
  align = "center",
  level = 2,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  /** `left` para as seções internas; o topo da página usa `center`. */
  align?: "center" | "left";
  /**
   * O nível do título. `2` por padrão; a PRIMEIRA seção da página passa `1`.
   *
   * ⚠️ **Existe porque o `h1` do cardápio morava no `PageHeader`, que saiu com
   * o redesenho de 18/09 — e `e2e/a-arvore-de-titulos-do-cardapio.spec.ts`
   * reprovou com "a página precisa de exatamente um h1", recebendo zero.**
   *
   * Pôr o `h1` de volta num cabeçalho separado seria repetir o título: o da
   * primeira seção JÁ é o título da página ("Cardápio da semana"). O nível
   * acompanha o papel em vez de duplicar o texto.
   */
  level?: 1 | 2;
  children: React.ReactNode;
}) {
  const centrado = align === "center";
  const Titulo = level === 1 ? "h1" : "h2";

  return (
    <section id={id} className="scroll-mt-24 pb-12 sm:pb-16">
      <Container className="max-w-3xl">
        <div
          className={`flex flex-col gap-3 pt-12 sm:pt-16 ${
            centrado ? "items-center text-center" : "items-start"
          }`}
        >
          <Titulo className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </Titulo>
          {subtitle ? (
            <p
              className={`text-pretty text-lg sm:text-xl text-muted-foreground ${centrado ? "max-w-xl" : ""}`}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {children}
      </Container>
    </section>
  );
}
