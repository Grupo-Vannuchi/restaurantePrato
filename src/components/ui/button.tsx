import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

/**
 * ⚠️ Sem `focus-visible:outline-none` aqui, e de propósito.
 *
 * `globals.css` desenha um contorno na cor da marca em `:focus-visible`, para
 * quem navega por teclado. Uma classe de utilitário apagando o contorno vence
 * essa regra por precedência de camada — e o botão do site inteiro passou a
 * receber foco de forma invisível, sem nada no lugar. Critério WCAG 2.4.7.
 *
 * Se algum dia for preciso trocar o contorno por um anel, troque: apagar sem
 * substituir é que não.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-brand-foreground hover:opacity-90",
  accent: "bg-accent text-[#0a0a0a] hover:opacity-90",
  outline: "border border-border bg-transparent hover:bg-muted",
  ghost: "bg-transparent hover:bg-muted",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-base",
};

/**
 * Shared button styling. Use `buttonVariants()` to style a link (e.g. next-intl
 * `<Link className={buttonVariants()}>`) and the `<Button>` component for actual
 * `<button>` elements.
 */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant, size, className, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        {...props}
      />
    );
  },
);
