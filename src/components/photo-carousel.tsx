"use client";

import Image from "next/image";
import {
  Carousel,
  CarouselSlide,
  type CarouselLabels,
} from "@/components/ui/carousel";

export type CarouselPhoto = { image: string; alt: string };

/**
 * Carrossel de fotos.
 *
 * A mecânica de deslize mora em `ui/carousel.tsx` desde 15/09 — o porquê da
 * rolagem em vez de fade, a ausência de autoplay, o alvo de 24 px dos
 * marcadores e o `role="list"` do trilho estão documentados lá. Aqui fica só o
 * que é específico de FOTO: o formato, o `priority` na primeira, o `lazy` nas
 * outras e a qualidade.
 *
 * ⚠️ **Nasceu como `PastaCarousel`, em `components/cardapio/`, e foi promovido
 * em 30/09/2026** quando `/reservas` passou a querer o mesmo comportamento com
 * outro assunto. O nome virou mentira antes do código: nada aqui sabe o que é
 * massa. Promovido em vez de duplicado — é exatamente o caminho que o projeto
 * irmão percorreu, e o `ui/carousel.tsx` daqui já dizia, desde a extração, que
 * existia para o dia em que aparecesse o segundo carrossel.
 *
 * ⚠️ **`sizes` é PROP, e não constante, e essa é a divergência deliberada do
 * irmão.** Lá os dois consumidores compartilham um `sizes` só. Aqui eles vivem
 * em caixas de larguras diferentes — a ilha de massas dentro de uma seção
 * `max-w-3xl`, o carrossel de `/reservas` na largura cheia do `Container` — e
 * `sizes` descreve a CAIXA, não a imagem. Um valor para os dois mentiria para
 * um deles, e este arquivo já pagou essa conta uma vez: o `sizes` anterior da
 * ilha prometia `100vw` e fazia o navegador escolher um balde MAIOR que o
 * arquivo de origem. Cada chamador mede a sua e passa.
 */
export function PhotoCarousel({
  photos,
  labels,
  sizes,
}: {
  photos: CarouselPhoto[];
  labels: CarouselLabels;
  /** Largura da caixa por faixa de tela — medida por quem chama. Ver acima. */
  sizes: string;
}) {
  return (
    <Carousel labels={labels} count={photos.length}>
      {photos.map((foto, i) => (
        <CarouselSlide key={foto.image} index={i} total={photos.length}>
          <Image
            src={foto.image}
            alt={foto.alt}
            width={1100}
            height={619}
            /* Só a primeira disputa a banda inicial; as outras só aparecem
               quando a pessoa deslizar. */
            priority={i === 0}
            loading={i === 0 ? undefined : "lazy"}
            quality={50}
            sizes={sizes}
            className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
          />
        </CarouselSlide>
      ))}
    </Carousel>
  );
}
