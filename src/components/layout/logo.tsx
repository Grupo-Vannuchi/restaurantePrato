import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Marca do restaurante, com link para a home.
 *
 * ⚠️ INTERINO: a logo do Restaurante Prato ainda não chegou. Até lá a marca é
 * tipográfica — o nome na serifada display que o site já carrega via `next/font`
 * para os títulos, sem requisição externa e sem custo de LCP. Os arquivos do
 * cliente anterior foram removidos: exibi-los aqui seria publicar a marca de
 * outra empresa.
 *
 * Quando a logo chegar (PR 2), as duas variantes voltam a ser imagem:
 *  - `wordmark` (padrão) — só o nome, para o header, que tem ~28px de altura
 *  - `lockup` — a marca completa, onde há espaço (rodapé)
 */
export function Logo({
  className,
  variant = "wordmark",
}: {
  className?: string;
  variant?: "wordmark" | "lockup";
}) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center", className)}
      aria-label={siteConfig.name}
    >
      <span
        className={cn(
          "font-serif font-bold tracking-tight text-brand",
          variant === "lockup" ? "text-3xl" : "text-xl",
        )}
      >
        {siteConfig.name}
      </span>
    </Link>
  );
}
