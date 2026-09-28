import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { GalleryPhotoView } from "@/lib/queries";

/**
 * Uma foto da galeria.
 *
 * ⚠️ **A legenda deixou de ser desenhada em 25/09/2026, a pedido do cliente — e
 * mudou de trabalho, não sumiu.**
 *
 * Antes ela era par do `alt`: com legenda visível, o `alt` ia VAZIO, porque a
 * `<figcaption>` logo abaixo já descrevia a foto e repetir faria o leitor de
 * tela dizer a mesma frase duas vezes; sem legenda, entrava um texto genérico
 * do catálogo ("Foto de um prato do restaurante").
 *
 * Apagar só a `<figcaption>` e deixar o resto teria mantido `alt=""` em toda
 * foto que tem legenda no banco — ou seja, as fotos da galeria ficariam
 * **sem descrição nenhuma** para quem não as vê, e o teste que cobra isso
 * (`e2e/a11y.spec.ts`, "descreve toda imagem") só acusaria depois.
 *
 * Então a legenda virou o `alt`. Quem enxerga vê só a foto, que é o pedido;
 * quem não enxerga ouve "A ilha de saladas, montada no começo do almoço" em
 * vez do genérico. O campo do painel continua o mesmo e continua valendo a
 * pena preencher — o que mudou é onde o texto aparece.
 */
/**
 * `priority` marca a PRIMEIRA foto da listagem. Sem ela, `next/image` deixa
 * tudo preguiçoso e o navegador só descobre a imagem depois de baixar e
 * aplicar o CSS — atraso puro justamente no maior elemento da tela. Só a
 * primeira: marcar todas faria as fotos disputarem banda entre si.
 */
export async function GalleryPhotoCard({
  photo,
  priority = false,
}: {
  photo: GalleryPhotoView;
  /** Só a primeira da grade — ver a nota acima. */
  priority?: boolean;
}) {
  const t = await getTranslations("galeria");
  return (
    <figure className="flex flex-col gap-2">
      <Image
        src={photo.image}
        // A legenda do painel É a descrição, agora que ela não é desenhada —
        // ver o docblock acima. Sem legenda cadastrada, cai no texto genérico
        // do catálogo, que é melhor que nada e pior que uma frase escrita.
        alt={photo.caption || t("photoAlt")}
        width={640}
        height={480}
        // Grade de 2 / 2 / 3 colunas: sem isto o navegador pede o arquivo do
        // tamanho da janela inteira e joga fora dois terços dos bytes.
        // ⚠️ Deixou de ter `100vw` em 10/09, quando a grade do celular passou a
        // duas colunas — um `sizes` que promete largura inteira faz o navegador
        // baixar o arquivo grande mesmo que o cartão ocupe metade da tela.
        sizes="(min-width: 1024px) 33vw, 50vw"
        priority={priority}
        quality={50}
        className="aspect-[4/3] w-full rounded-xl object-cover"
      />
    </figure>
  );
}
