"use client";

import Image from "next/image";
import {
  Carousel,
  CarouselSlide,
  type CarouselLabels,
} from "@/components/ui/carousel";

export type PastaPhoto = { image: string; alt: string };

/**
 * As fotos que abrem a ilha de massas.
 *
 * A mecânica de deslize mora em `ui/carousel.tsx` desde 15/09 — o porquê da
 * rolagem em vez de fade, a ausência de autoplay, o alvo de 24 px dos
 * marcadores e o `role="list"` do trilho estão documentados lá. Aqui fica só o
 * que é específico de FOTO: o formato, o `priority` na primeira, o `lazy` nas
 * outras e a qualidade.
 */
export function PastaCarousel({
  photos,
  labels,
}: {
  photos: PastaPhoto[];
  labels: CarouselLabels;
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
            /*
             * ⚠️ **O `sizes` descreve a CAIXA, e o anterior mentia em dois
             * trechos de largura.**
             *
             * Ele dizia `100vw` abaixo de 1280 px. O carrossel vive dentro do
             * `Container` (recuo de 20 px por lado no celular, 32 de `sm` para
             * cima) numa seção `max-w-3xl`, então ele nunca ocupa a tela toda.
             *
             * Medido no Pixel 7: o slide renderiza com **372 px**, e com a
             * densidade 2,625 do aparelho precisa de **977 px** de imagem. Com
             * `100vw` o navegador calculava 412 × 2,625 = 1081 e escolhia o
             * balde de **1200** — que é MAIOR que o arquivo de origem, de 1100
             * px. Pedir ao otimizador para ampliar não acrescenta detalhe
             * nenhum: é banda e processamento gastos para devolver a mesma foto
             * esticada.
             *
             * O balde certo para 977 px é 1080, e ele cabe dentro do arquivo.
             *
             * Entre 832 e 1280 px de tela a mentira era ao contrário e maior:
             * `100vw` prometia até 1280 quando a caixa já estava travada em 768
             * pelo `max-w-3xl`. A condição de 832 é onde `100vw - 64` alcança
             * 768 e o limite passa a mandar.
             *
             * Mesma classe de correção que a galeria recebeu em 10/09, quando
             * `100vw` num grid de duas colunas fazia cada foto baixar o dobro.
             */
            sizes="(min-width: 832px) 768px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 40px)"
            className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]"
          />
        </CarouselSlide>
      ))}
    </Carousel>
  );
}
