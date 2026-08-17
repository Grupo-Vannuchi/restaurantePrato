import { MessageCircle, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { phoneLink, siteConfig, whatsappLink } from "@/config/site";

type Variant = "primary" | "outline" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

/**
 * The reservation CTA. Reservations happen straight in WhatsApp — there is no
 * booking backend — so this opens a wa.me deep link with a pre-filled message.
 *
 * Enquanto não houver número de WhatsApp configurado ele degrada para um link
 * `tel:`; se também não houver telefone, não renderiza nada — em vez de exibir
 * um botão que não leva a lugar nenhum.
 */
export async function ReserveButton({
  variant = "primary",
  size = "md",
  className,
  message,
  label,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  /** Overrides the default pre-filled WhatsApp text (e.g. group bookings). */
  message?: string;
  /** Overrides the button label. */
  label?: string;
}) {
  const t = await getTranslations("common");
  const href = whatsappLink(message);
  const tel = phoneLink();
  const { phone } = siteConfig.contact;

  if (!href) {
    // Sem WhatsApp e sem telefone não há canal nenhum para abrir — melhor não
    // renderizar botão do que renderizar um link morto.
    if (!tel || !phone) return null;
    return (
      <a href={tel} className={buttonVariants({ variant, size, className })}>
        <Phone className="size-5" />
        {t("callUs", { phone })}
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant, size, className })}
    >
      <MessageCircle className="size-5" />
      {label ?? t("makeReservation")}
    </a>
  );
}
