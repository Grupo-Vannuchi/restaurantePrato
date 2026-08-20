"use client";

import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/ui/icon";

export type InformationLink = {
  slug: string;
  title: string;
  icon: string;
};

/**
 * The "Novidades" burger shown in the top-right of the navbar.
 * Hovering (or keyboard-focusing) it reveals a dropdown listing every published
 * entry; clicking the burger itself navigates to the /novidades index.
 * Pure CSS hover — the same mechanism the header's other dropdowns use.
 */
export function InformationMenu({ links }: { links: InformationLink[] }) {
  const t = useTranslations("novidades");

  return (
    <div className="group relative">
      <Link
        href="/novidades"
        aria-label={t("menuLabel")}
        className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground group-focus-within:text-foreground"
      >
        <Menu className="size-6" />
      </Link>

      <div className="invisible absolute right-0 top-full z-50 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="max-h-[min(70vh,32rem)] min-w-64 max-w-80 overflow-y-auto overscroll-contain rounded-md border border-border bg-background p-1 shadow-lg">
          {links.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul>
              {links.map((link) => (
                <li key={link.slug}>
                  <Link
                    href={`/novidades/${link.slug}`}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Icon name={link.icon} className="size-4" />
                    </span>
                    <span className="truncate">{link.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
