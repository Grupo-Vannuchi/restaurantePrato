import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

/**
 * O card de fechamento na cor da marca: título, corpo e uma fileira de ações.
 *
 * Existe porque o mesmo bloco estava copiado em `sections/cta.tsx` e em
 * `/experiencia`, e `/gastronomia` seria a terceira cópia. O motivo prático de
 * unificar agora é o PR 2: a paleta do cliente ainda não chegou, e quando
 * chegar a troca precisa acontecer num lugar só.
 *
 * `footer` existe para o disclaimer de `/experiencia`, que fica dentro do
 * `Container` mas **fora** do card colorido.
 */
export function ClosingCta({
  title,
  children,
  actions,
  footer,
}: {
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="py-20 sm:py-section">
      <Container>
        <Reveal className="relative overflow-hidden rounded-2xl bg-brand px-6 py-16 text-brand-foreground sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h2>
            {children ? <div className="mt-5">{children}</div> : null}
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {actions}
            </div>
          </div>
        </Reveal>
        {footer}
      </Container>
    </section>
  );
}
