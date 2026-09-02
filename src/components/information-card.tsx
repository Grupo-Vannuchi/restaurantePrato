"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link2, Image as ImageIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useInformationGallery } from "@/components/information-gallery";
import type { InformationView } from "@/lib/queries";

/**
 * Information catalog card, matching the reference site's design: the cover image
 * fills the whole card under a brand-colour tint, with the title overlaid top-left
 * and two round actions bottom-left —
 *   • link button  → navigates to the information's detail page (its slug)
 *   • image button → opens the shared lightbox carousel at this image
 * (see InformationGallery, which renders the single modal for the whole grid).
 */
/**
 * `priority` marca a PRIMEIRA foto da listagem. Sem ela, `next/image` deixa
 * tudo preguiçoso e o navegador só descobre a imagem depois de baixar e
 * aplicar o CSS — atraso puro justamente no maior elemento da tela. Só a
 * primeira: marcar todas faria as fotos disputarem banda entre si.
 */
export function InformationCard({
  information,
  priority = false,
  headingLevel = 3,
}: {
  information: InformationView;
  /** Só a primeira da grade — ver a nota acima. */
  priority?: boolean;
  /**
   * Nível do título do card. O padrão 3 vale onde ele fica sob uma seção — é o
   * caso da lista de relacionadas do artigo, que tem um `<h2>` em cima.
   *
   * ⚠️ O índice `/novidades` precisa de 2: lá a grade vem direto abaixo do
   * `<h1>` da página, e o `<h3>` fixo produzia um salto h1 → h3. O nível não é
   * propriedade do card, é de onde ele foi colocado.
   */
  headingLevel?: 2 | 3;
}) {
  const t = useTranslations("novidades");
  // A classe fica no elemento, então trocar a tag não muda um pixel.
  const Titulo = headingLevel === 2 ? "h2" : "h3";
  const gallery = useInformationGallery();

  const actionClass =
    "inline-flex size-10 items-center justify-center rounded-full border border-white/80 text-white transition-colors hover:bg-white hover:text-brand focus-visible:bg-white focus-visible:text-brand";

  return (
    <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand">
      {information.image ? (
        <Image
          src={information.image}
          alt=""
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : null}

      {/* Tingimento da marca sobre a foto: identidade, não legibilidade. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-brand/90 to-brand/60 transition-opacity duration-300 group-hover:opacity-90"
      />

      {/*
        * O que de fato torna o texto legível. O tingimento acima sozinho dava
        * 2,15:1 no pior ponto do degradê — e o defeito só aparece quando o
        * cliente publica as fotos, porque sem foto o card fica sobre a marca
        * opaca e passa. Ver a nota em `globals.css`.
        */}
      <div aria-hidden className="veu-de-legibilidade absolute inset-0" />

      <Titulo className="absolute inset-x-0 top-0 max-w-[88%] text-balance p-5 text-lg font-bold leading-snug text-white">
        {information.title}
      </Titulo>

      <div className="absolute bottom-0 left-0 flex items-center gap-2 p-5">
        <Link
          href={`/novidades/${information.slug}`}
          aria-label={t("view")}
          className={actionClass}
        >
          <Link2 className="size-5" />
        </Link>
        <button
          type="button"
          onClick={() => gallery?.openAt(information.slug)}
          aria-label={t("viewImage")}
          className={actionClass}
        >
          <ImageIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}
