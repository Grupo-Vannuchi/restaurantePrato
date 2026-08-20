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
export function InformationCard({
  information,
}: {
  information: InformationView;
}) {
  const t = useTranslations("novidades");
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
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : null}

      {/* Brand tint over the photo (keeps the title legible). */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-brand/90 to-brand/60 transition-opacity duration-300 group-hover:opacity-90"
      />

      <h3 className="absolute inset-x-0 top-0 max-w-[88%] text-balance p-5 text-lg font-bold leading-snug text-white">
        {information.title}
      </h3>

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
