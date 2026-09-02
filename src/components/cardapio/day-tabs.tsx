"use client";

import { useRef, useState, type ReactNode } from "react";
import { WEEKDAYS, type Weekday } from "@/config/menu";
import { cn } from "@/lib/utils";

/**
 * O seletor de dia do cardápio, com o padrão `tablist` implementado de verdade.
 *
 * ⚠️ Este projeto já teve um `role="tablist"` declarado e não cumprido — o de
 * "regiões que atendemos", removido em 27/08. Ele apontava `aria-controls` para
 * painéis que não existiam, não tinha navegação por setas, e mantinha as cinco
 * abas na ordem de tabulação. Declarar o padrão e não cumpri-lo é pior que não
 * declarar: o leitor de tela promete um comportamento à pessoa e a página não
 * entrega.
 *
 * As três coisas que o padrão exige, e que o componente do projeto irmão ainda
 * não faz:
 *
 * - **Uma parada de tabulação só** para o grupo. Cinco abas na ordem de
 *   tabulação obrigam a apertar Tab cinco vezes para atravessar um seletor que
 *   a seta resolve numa tecla.
 * - **Setas movem entre as abas**, circulando nas pontas.
 * - **Todos os painéis no DOM**, escondidos com `hidden`. Renderizar só o ativo
 *   faz o `aria-controls` das outras apontar para o nada.
 *
 * `today` chega de fora, já resolvido no fuso do restaurante — calcular o dia
 * aqui usaria o relógio do visitante, que pode estar noutro fuso, e ainda seria
 * impureza de render. Vem `null` no fim de semana, quando a casa não abre.
 */
export function DayTabs({
  labels,
  todayLabel,
  selectorLabel,
  today,
  children,
}: {
  /** Rótulo visível de cada dia, vindo do catálogo. */
  labels: Record<number, string>;
  /** Marca "hoje" na aba do dia corrente. */
  todayLabel: string;
  /** Nome do grupo de abas, para quem chega nele por leitor de tela. */
  selectorLabel: string;
  /** O dia de hoje (1–5), ou `null` no fim de semana. */
  today: number | null;
  /** Um painel por dia, na ordem de `WEEKDAYS`. */
  children: ReactNode[];
}) {
  const [escolhido, setEscolhido] = useState<Weekday | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // A escolha da pessoa manda; sem ela, hoje; no fim de semana, segunda — abrir
  // em branco seria pior que abrir no primeiro dia útil.
  const ativo = escolhido ?? (today as Weekday | null) ?? WEEKDAYS[0];

  function aoTeclar(evento: React.KeyboardEvent, indice: number) {
    const passo =
      evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
    if (passo === 0) return;
    evento.preventDefault();
    // Circula nas pontas: da última para a frente volta à primeira.
    const proximo = (indice + passo + WEEKDAYS.length) % WEEKDAYS.length;
    setEscolhido(WEEKDAYS[proximo]!);
    refs.current[proximo]?.focus();
  }

  return (
    <>
      <div
        role="tablist"
        aria-label={selectorLabel}
        /* Rola na horizontal no celular pequeno em vez de quebrar em duas
           linhas, que empurraria o cardápio para fora da primeira tela. */
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
      >
        {WEEKDAYS.map((dia, i) => {
          const selecionada = dia === ativo;
          return (
            <button
              key={dia}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`dia-${dia}`}
              aria-selected={selecionada}
              aria-controls={`painel-${dia}`}
              // Só a aba ativa entra na ordem de tabulação; as outras são
              // alcançadas pelas setas. É o "roving tabindex" do padrão.
              tabIndex={selecionada ? 0 : -1}
              onClick={() => setEscolhido(dia)}
              onKeyDown={(e) => aoTeclar(e, i)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-medium transition-colors",
                selecionada
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-brand hover:text-brand",
              )}
            >
              {labels[dia]}
              {today === dia ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    selecionada ? "bg-background/20" : "bg-brand/10 text-brand",
                  )}
                >
                  {todayLabel}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {WEEKDAYS.map((dia, i) => (
        <div
          key={dia}
          role="tabpanel"
          id={`painel-${dia}`}
          aria-labelledby={`dia-${dia}`}
          hidden={dia !== ativo}
          className="mt-8"
        >
          {children[i]}
        </div>
      ))}
    </>
  );
}
