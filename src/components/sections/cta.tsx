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
            className="border-white/70 text-brand-foreground hover:bg-white/10"
          />
        </>
      }
    >
      {/* Sem `opacity-90`: branco a 90% sobre o verde da marca mede 4,39:1,
          abaixo do mínimo de 4,5 da WCAG AA — o verde chapado com branco opaco
          dá 4,98:1, e a folga de 10% não cabe uma camada de transparência. A
          hierarquia entre título e corpo já vem de tamanho e peso, que é como
          ela deve vir; a opacidade estava fazendo de graça um trabalho que o
          `text-3xl font-bold` do título já faz. */}
      <p className="text-pretty">{t("subtitle")}</p>
    </ClosingCta>
  );
}
