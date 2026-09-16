import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

/**
 * O card de fechamento na cor da marca: título, corpo e uma fileira de ações.
 *
 * Existe porque o mesmo bloco estava copiado em `sections/cta.tsx` e em
 * `/experiencia`, e a página do cardápio seria a terceira cópia. O motivo de
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
          {/*
           * ⚠️ **O borrão ESCURECE, e isso é medição — era `bg-white/10`.**
           *
           * Ele é decoração `aria-hidden`, um brilho suave no canto. Sobre um
           * cartão de texto branco, clarear o fundo REDUZ o contraste: branco a
           * 10% sobre o verde da marca leva o fundo de 4,98:1 para 4,07:1, e no
           * celular — onde o cartão é estreito e o título centralizado alcança o
           * canto — o título medido deu **4,11:1**, abaixo do mínimo de 4,5.
           *
           * O título é branco OPACO, então não havia opacidade de texto para
           * culpar: quem derrubava o número era o fundo. Foi por isso que a
           * auditoria de 04/09 não viu — ela olhou o corpo translúcido e parou.
           *
           * Escurecendo, a mesma forma passa a ajudar: o mesmo ponto mede
           * 5,79:1, melhor que os 4,98 do verde chapado. E é robusto por
           * construção — qualquer escurecimento de um fundo sob texto claro só
           * pode melhorar, então mexer na opacidade daqui não reabre o defeito.
           */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-foreground/10 blur-2xl"
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
