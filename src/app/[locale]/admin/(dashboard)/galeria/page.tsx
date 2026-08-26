import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { Plus, Pencil } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { GalleryPhotoDeleteButton } from "@/components/admin/gallery-photo-delete-button";
import { getAdminGalleryPhotos } from "@/lib/admin-queries";
import { localize } from "@/lib/content";
import { resolveLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export default async function AdminGaleriaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("admin.galeria");
  const photos = await getAdminGalleryPhotos();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Link href="/admin/galeria/new" className={buttonVariants({ size: "md" })}>
          <Plus className="size-4" />
          {t("new")}
        </Link>
      </div>

      {photos.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <Image
                  src={photo.image}
                  alt={localize(photo.caption, locale)}
                  width={400}
                  height={225}
                  className="size-full object-cover"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    photo.published
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {photo.published ? t("statusPublished") : t("statusDraft")}
                </span>
              </div>

              {/* Cabeçalho, não parágrafo: era o ÚNICO texto que identificava
                  o cartão, e uma foto sem legenda deixava o `<li>` inteiro sem
                  nome — os botões "Editar" e "Excluir" dentro dele ficavam
                  indistinguíveis dos das outras fotos. */}
              <h2 className="truncate text-sm text-muted-foreground">
                {localize(photo.caption, locale) || t("noCaption")}
              </h2>

              <div className="flex items-center gap-1 border-t border-border pt-3">
                <Link
                  href={`/admin/galeria/${photo.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="size-4" />
                  {t("edit")}
                </Link>
                <GalleryPhotoDeleteButton id={photo.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
