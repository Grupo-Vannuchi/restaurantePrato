import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { GalleryPhotoView } from "@/lib/queries";

/**
 * Uma foto da galeria. A legenda é opcional e some quando vazia — mas a
 * página existe para mostrar fotos, então uma foto sem legenda ainda precisa
 * de um `alt` não vazio para quem usa leitor de tela.
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
        // Com legenda, o `alt` fica vazio: a `<figcaption>` logo abaixo já
        // descreve a foto, e repetir faz o leitor dizer a mesma frase duas
        // vezes. Sem legenda, o `alt` é a única descrição que existe.
        alt={photo.caption ? "" : t("photoAlt")}
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
      {photo.caption ? (
        <figcaption className="text-sm text-muted-foreground">
          {photo.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
