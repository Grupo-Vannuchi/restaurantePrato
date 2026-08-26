import { Container } from "@/components/ui/container";

/**
 * Faixa de título do topo das páginas internas.
 *
 * ⚠️ **Sem `Reveal` aqui, e o motivo é medido.** `Reveal` renderiza no servidor
 * com `data-visible="false"`, e o CSS dá `opacity: 0` a tudo que tem
 * `[data-reveal]` — então o título só aparecia depois de baixar o JavaScript,
 * hidratar e o observador de interseção disparar. Em rede de celular médio em
 * 4G, com a CPU quatro vezes mais lenta, isso dava **2,7 a 2,9 segundos de tela
 * sem título** em cinco páginas; a home escapava só porque o topo dela é outro
 * componente.
 *
 * A medição de LCP não acusava: ela ficou entre 228 e 1008 ms porque LCP mede o
 * maior elemento PINTADO, e um título transparente não conta.
 *
 * A revelação ao rolar continua nas seções abaixo da dobra, que é onde ela é o
 * que promete ser. Aqui ela cobrava 2,2 segundos de conteúdo por uma animação
 * que quase ninguém chega a ver.
 */
export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-border bg-muted/30">
      <Container className="py-16 sm:py-20">
        <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </Container>
    </div>
  );
}
