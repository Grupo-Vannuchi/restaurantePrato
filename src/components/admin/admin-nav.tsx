"use client";

import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Inbox,
  Info,
  UtensilsCrossed,
  Images,
  Quote,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/cardapio", key: "cardapio", icon: UtensilsCrossed, exact: false },
  { href: "/admin/galeria", key: "galeria", icon: Images, exact: false },
  { href: "/admin/novidades", key: "novidades", icon: Info, exact: false },
  { href: "/admin/testimonials", key: "testimonials", icon: Quote, exact: false },
  { href: "/admin/leads", key: "leads", icon: Inbox, exact: false },
] as const;

export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("primary")} className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand/10 text-brand"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            <span className="flex-1">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
