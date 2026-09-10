import Image from "next/image";

import { Container } from "@/components/ui/container";
import { cn } from "@/lib/utils";

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
 *
 * ⚠️ **A foto de fundo entrou em 10/09, e ela é o lugar do AMBIENTE.** A galeria
 * passou a mostrar só comida, alinhando com o projeto irmão — a decisão de lá é
 * que "galeria é para o que se come". As fotos de salão, balcão e fachada não
 * foram descartadas: mudaram de lugar, para o topo das páginas onde dizem algo
 * sobre estar lá.
 */
export function PageHeader({
  title,
  subtitle,
  image,
  imageAlt = "",
}: {
  title: string;
  subtitle?: string;
  /**
   * Foto de fundo, opcional. Com ela a faixa INVERTE: véu escuro sobre a
   * imagem e texto claro. Sem ela nada muda — as páginas sem foto seguem com o
   * fundo claro de sempre.
   */
  image?: string;
  imageAlt?: string;
}) {
  const comFoto = Boolean(image);

  return (
    <div
      className={cn(
        "relative isolate border-b border-border",
        comFoto ? "overflow-hidden" : "bg-muted/30",
      )}
    >
      {comFoto ? (
        <>
          <Image
            src={image!}
            alt={imageAlt}
            fill
            priority
            sizes="100vw"
            quality={50}
            className="object-cover"
          />
          {/* ⚠️ **Véu medido, não estimado**, e os números estão no commit.
              No celular ele é mais fechado e quase uniforme: a copy ocupa a
              largura inteira, então não existe canto "sem texto" para o
              gradiente abrir. Com o véu do desktop, o subtítulo cairia abaixo
              do mínimo ali.

              Ao trocar a foto por uma mais clara, MEÇA de novo — e esconda o
              texto antes de medir, senão o pixel mais claro que você lê é a
              própria letra e a conta sai errada. A guarda
              `e2e/o-texto-sobre-a-foto-continua-legivel.spec.ts` cobre estas
              faixas. */}
          <div
            aria-hidden
            className="absolute inset-0 bg-foreground/82 sm:bg-transparent sm:bg-gradient-to-r sm:from-foreground/88 sm:via-foreground/78 sm:to-foreground/55"
          />
        </>
      ) : null}

      <Container className="relative py-16 sm:py-20">
        <h1
          className={cn(
            "max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl",
            comFoto && "text-background",
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={cn(
              "mt-4 max-w-2xl text-pretty text-lg",
              comFoto ? "text-background" : "text-muted-foreground",
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </Container>
    </div>
  );
}
