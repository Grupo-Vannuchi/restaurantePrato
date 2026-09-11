"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const listaRef = useRef<HTMLDivElement | null>(null);

  // A escolha da pessoa manda; sem ela, hoje; no fim de semana, segunda — abrir
  // em branco seria pior que abrir no primeiro dia útil.
  const ativo = escolhido ?? (today as Weekday | null) ?? WEEKDAYS[0];

  /*
   * ⚠️ **Traz a aba ativa para dentro da faixa visível do rolador.**
   *
   * No celular as cinco abas não caberiam lado a lado, então a faixa rola na
   * horizontal — e ela começa no zero, no primeiro dia útil. Numa sexta-feira,
   * a aba de HOJE, que é a que o cardápio abre selecionada, ficava em 398 px
   * numa faixa de 404: seis pixels dela na tela. Quem chegava via segunda,
   * terça e quarta, nenhuma selecionada, e o painel embaixo mostrando um dia
   * que não estava à vista.
   *
   * `scrollLeft` direto, e não `scrollIntoView`: aquele rola TODO ancestral
   * rolável até o elemento aparecer, incluindo a página — o visitante que abre
   * `/cardapio` seria jogado para o meio do documento sem ter pedido nada.
   *
   * Só age quando a aba está fora da faixa, e centraliza. Depende de `ativo`
   * porque a seleção também muda por clique, e clicar numa aba cortada pela
   * borda não a traz para dentro sozinho — as setas do teclado trazem, porque
   * `focus()` rola, e é justamente essa diferença que deixava o clique pior que
   * o teclado.
   */
  useEffect(() => {
    const lista = listaRef.current;
    const aba = refs.current[WEEKDAYS.indexOf(ativo)];
    if (!lista || !aba) return;

    const faixa = lista.getBoundingClientRect();
    const dela = aba.getBoundingClientRect();
    if (dela.left >= faixa.left - 1 && dela.right <= faixa.right + 1) return;

    lista.scrollLeft += dela.left - faixa.left - (faixa.width - dela.width) / 2;
  }, [ativo]);

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
        ref={listaRef}
        role="tablist"
        aria-label={selectorLabel}
        /* Rola na horizontal no celular pequeno em vez de quebrar em duas
           linhas, que empurraria o cardápio para fora da primeira tela.

           ⚠️ **O recuo vertical existe para o ANEL DE FOCO, não para respiro.**
           `overflow-x: auto` faz o eixo vertical computar `auto` também — a
           regra do CSS é que `visible` num eixo vira `auto` quando o outro não
           é `visible` —, então a caixa recorta em cima e embaixo. O anel de
           `globals.css` é `2px` de traço com `2px` de deslocamento, ou seja 4 px
           para fora do botão, e o recuo de topo era ZERO: quem percorre as abas
           por teclado via o anel cortado ao meio justamente na borda de cima.
           Os 6 px de `py-1.5` cobrem os 4 com folga, e os `-my-1.5` devolvem o
           espaço ao layout para a página não mudar de altura. */
        className="-mx-4 -my-1.5 flex gap-2 overflow-x-auto px-4 py-1.5 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
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
                /*
                 * ⚠️ **Par SÓLIDO nos dois estados, e é medição, não gosto.**
                 *
                 * O selo era translúcido nas duas posições, e translúcido sobre
                 * superfície da mesma família de cor não rende contraste:
                 * `bg-background/20` herdando o texto branco da aba selecionada
                 * dava **3,38:1**, e `bg-brand/10` com `text-brand` sobre o
                 * cartão dava **4,24:1** — os dois abaixo dos 4,5:1 da AA, num
                 * texto de 10 px.
                 *
                 * `test/palette-contrast.test.ts` seguia verde porque os dois
                 * tokens são legítimos; o que falhava era a MISTURA, que não
                 * existe declarada em lugar nenhum. Mesma classe do véu do topo.
                 *
                 * O par invertido resolve com o que a paleta já garante: aqui os
                 * dois estados são `brand` contra `background`, 4,98:1, o mesmo
                 * par que aquele teste vigia — mexer no verde da marca acusa nos
                 * dois lugares em vez de num só.
                 */
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    selecionada
                      ? "bg-background text-brand"
                      : "bg-brand text-brand-foreground",
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
