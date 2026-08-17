import { getTranslations } from "next-intl/server";
import { Music2 } from "lucide-react";
import { Instagram, Linkedin, Facebook } from "@/components/ui/brand-icons";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/layout/logo";
import { Container } from "@/components/ui/container";
import { MapEmbed } from "@/components/layout/map-embed";
import { siteConfig, fullAddress, mapEmbedUrl } from "@/config/site";

const socialIcons = {
  instagram: Instagram,
  tiktok: Music2,
  linkedin: Linkedin,
  facebook: Facebook,
} as const;

export async function Footer() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const year = new Date().getFullYear();

  const socials = Object.entries(siteConfig.social).filter(
    ([, url]) => Boolean(url),
  ) as [keyof typeof socialIcons, string][];

  const address = fullAddress();
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const mapSrc = mapEmbedUrl();

  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          {/* The footer has the vertical room the header doesn't, so it carries
              the complete mark — stove and all. */}
          <Logo variant="lockup" />
          <p className="max-w-xs text-sm text-muted-foreground">
            {t("tagline")}
          </p>
        </div>

        <nav aria-label={t("navTitle")} className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t("navTitle")}</h3>
          {siteConfig.nav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {tn(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t("contactTitle")}</h3>
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {siteConfig.contact.email}
          </a>
          {siteConfig.contact.phone ? (
            <span className="text-sm text-muted-foreground">
              {siteConfig.contact.phone}
            </span>
          ) : null}
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {siteConfig.contact.address.street}
            <br />
            {siteConfig.contact.address.city} — {siteConfig.contact.address.region}
          </a>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t("socialTitle")}</h3>
          <div className="flex gap-3">
            {socials.map(([key, url]) => {
              const Icon = socialIcons[key];
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={key}
                  className="inline-flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-brand hover:text-brand"
                >
                  <Icon className="size-4" />
                </a>
              );
            })}
          </div>
        </div>
      </Container>

      <div className="border-t border-border">
        <Container className="py-10">
          <MapEmbed src={mapSrc} title={t("mapTitle")} />
        </Container>
      </div>

      <div className="border-t border-border">
        <Container className="flex flex-col gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.legalName ?? siteConfig.name}. {t("rights")}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              {t("terms")}
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              {t("privacy")}
            </Link>
            {siteConfig.registration ? (
              <span>{t("registration", { value: siteConfig.registration })}</span>
            ) : null}
          </div>
        </Container>
      </div>
    </footer>
  );
}
