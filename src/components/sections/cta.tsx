import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ClosingCta } from "@/components/sections/closing-cta";
import { ReserveButton } from "@/components/reserve-button";

export async function CTA() {
  const t = await getTranslations("home.cta");

  return (
    <ClosingCta
      title={t("title")}
      actions={
        <>
          <Link
            href="/reservas"
            className={buttonVariants({
              variant: "accent",
              size: "lg",
              className: "group",
            })}
          >
            {t("button")}
            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <ReserveButton
            variant="outline"
            size="lg"
            className="border-white/40 text-brand-foreground hover:bg-white/10"
          />
        </>
      }
    >
      <p className="text-pretty opacity-90">{t("subtitle")}</p>
    </ClosingCta>
  );
}
