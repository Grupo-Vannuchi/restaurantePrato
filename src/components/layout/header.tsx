"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/layout/logo";
import {
  InformationMenu,
  type InformationLink,
} from "@/components/layout/information-menu";
import { Icon } from "@/components/ui/icon";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { siteConfig, type NavKey } from "@/config/site";

export type DropdownLink = {
  slug: string;
  title: string;
};

export function Header({
  serviceLinks = [],
  informationLinks = [],
}: {
  serviceLinks?: DropdownLink[];
  informationLinks?: InformationLink[];
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState<NavKey | null>(null);

  /**
   * Per-nav-key child links that turn an item into a dropdown. Only
   * "Nossa Gastronomia" has children; the gallery lives inside "A Experiência"
   * and is not a top-level menu item, per the client's navigation.
   */
  const dropdowns: Partial<Record<NavKey, DropdownLink[]>> = {
    gastronomia: serviceLinks,
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Logo />

        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label="Primary"
        >
          {siteConfig.nav.map((item) => {
            const links = dropdowns[item.key] ?? [];

            if (links.length === 0) {
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t(item.key)}
                </Link>
              );
            }

            return (
              <div key={item.key} className="group relative">
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground group-focus-within:text-foreground"
                >
                  {t(item.key)}
                  <ChevronDown className="size-4 transition-transform group-hover:rotate-180 group-focus-within:rotate-180" />
                </Link>
                <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <ul className="min-w-56 max-w-72 rounded-md border border-border bg-background p-1 shadow-lg">
                    {links.map((link) => (
                      <li key={link.slug}>
                        <Link
                          href={`${item.href}#${link.slug}`}
                          className="block truncate rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {link.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/reservas" className={buttonVariants({ size: "sm" })}>
            {tc("talkToUs")}
          </Link>
          <InformationMenu links={informationLinks} />
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md md:hidden"
          aria-expanded={open}
          aria-label={open ? t("closeMenu") : t("openMenu")}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </Container>

      {open ? (
        <div className="border-t border-border bg-background md:hidden">
          <Container className="flex flex-col gap-1 py-4">
            {siteConfig.nav.map((item) => {
              const links = dropdowns[item.key] ?? [];

              if (links.length === 0) {
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-2 py-2.5 text-base font-medium hover:bg-muted"
                  >
                    {t(item.key)}
                  </Link>
                );
              }

              const expanded = openKey === item.key;

              return (
                <div key={item.key}>
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex-1 rounded-md px-2 py-2.5 text-base font-medium hover:bg-muted"
                    >
                      {t(item.key)}
                    </Link>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-label={t(item.key)}
                      onClick={() =>
                        setOpenKey((k) => (k === item.key ? null : item.key))
                      }
                      className="inline-flex size-10 items-center justify-center rounded-md hover:bg-muted"
                    >
                      <ChevronDown
                        className={`size-5 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                  {expanded ? (
                    <ul className="ml-2 flex flex-col gap-0.5 border-l border-border pl-2">
                      {links.map((link) => (
                        <li key={link.slug}>
                          <Link
                            href={`${item.href}#${link.slug}`}
                            onClick={() => setOpen(false)}
                            className="block truncate rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {link.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
            {informationLinks.length > 0 ? (
              <div className="mt-2 border-t border-border pt-2">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("novidades")}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {informationLinks.map((link) => (
                    <li key={link.slug}>
                      <Link
                        href={`/novidades/${link.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Icon name={link.icon} className="size-4 shrink-0" />
                        <span className="truncate">{link.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-end border-t border-border pt-3">
              <Link
                href="/reservas"
                onClick={() => setOpen(false)}
                className={buttonVariants({ size: "sm" })}
              >
                {tc("talkToUs")}
              </Link>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
