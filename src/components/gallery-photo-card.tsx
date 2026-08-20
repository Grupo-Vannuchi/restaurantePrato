import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { GalleryPhotoView } from "@/lib/queries";

/**
 * Uma foto da galeria. A legenda é opcional e some quando vazia — mas a
 * página existe para mostrar fotos, então uma foto sem legenda ainda precisa
 * de um `alt` não vazio para quem usa leitor de tela.
 */
export async function GalleryPhotoCard({ photo }: { photo: GalleryPhotoView }) {
  const t = await getTranslations("galeria");
  return (
    <figure className="flex flex-col gap-2">
      <Image
        src={photo.image}
        alt={photo.caption || t("photoAlt")}
        width={640}
        height={480}
        // Grade de 1 / 2 / 3 colunas: sem isto o navegador pede o arquivo do
        // tamanho da janela inteira e joga fora dois terços dos bytes.
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
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
