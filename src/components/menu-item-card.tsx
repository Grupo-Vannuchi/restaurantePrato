import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { MenuItemView } from "@/lib/queries";

/** 1 = segunda … 5 = sexta — indexado por `weekday - 1` para o rótulo traduzido. */
const weekdayKeys = ["weekday1", "weekday2", "weekday3", "weekday4", "weekday5"] as const;

/** Card de um prato. Sem preço: o cliente não publica valores. */
export async function MenuItemCard({ item }: { item: MenuItemView }) {
  const t = await getTranslations("gastronomia");
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-5">
      {item.weekday !== null ? (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
          <span className="sr-only">{t("weekOfTitle")}: </span>
          {t(weekdayKeys[item.weekday - 1])}
        </span>
      ) : null}
      {item.image ? (
        <Image
          src={item.image}
          alt={item.name}
          width={480}
          height={320}
          // Grade de 1 / 2 / 3 colunas: sem isto o navegador pede o arquivo do
          // tamanho da janela inteira e joga fora dois terços dos bytes.
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="h-40 w-full rounded-lg object-cover"
        />
      ) : null}
      <div className="flex flex-col gap-1.5">
        <h3 className="font-serif text-lg font-bold">{item.name}</h3>
        {item.description ? (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        ) : null}
      </div>
      {item.tags.length > 0 ? (
        <ul className="mt-auto flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
