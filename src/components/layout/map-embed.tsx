"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lazily mounts the Google Maps embed only when the footer scrolls near the
 * viewport (IntersectionObserver, 300px margin). The interactive `output=embed`
 * iframe pulls ~270ms of Maps JS main-thread work; native `loading="lazy"` still
 * loaded it during the initial-load window on desktop (its preload margin is
 * large enough to reach the footer), which tanked TBT. Deferring the mount until
 * the user actually approaches the footer keeps that cost off the critical path
 * and out of the performance trace — same Google map, no click, no API key.
 */
export function MapEmbed({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setShow(true);
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <div
      ref={ref}
      className="h-64 w-full overflow-hidden rounded-2xl border border-border bg-muted/40"
    >
      {show ? (
        <iframe
          title={title}
          src={src}
          loading="lazy"
          /*
           * ⚠️ **Fora da ordem de tabulação, de propósito — e isto parece um
           * defeito de acessibilidade até se ler o porquê.**
           *
           * O mapa embutido é uma parada de teclado que leva para DENTRO de um
           * quadro de outro domínio: o foco entra nos controles da Google, o
           * indicador de foco some de vista (ele está dentro do iframe) e a
           * página de fora não rola atrás dele. Quem navega por teclado
           * atravessa meia dúzia de paradas sem saber onde está.
           *
           * E é pior que inútil: em 18/09/2026 a página de contato ganhou uma
           * linha e isso bastou para o quadro terminar ACIMA da janela, com uma
           * faixa de 31 px sobrando atrás do cabeçalho fixo. Ou seja, o foco
           * ficava num elemento que a pessoa não vê — exatamente o que o
           * critério 2.4.11 proíbe. `e2e/o-foco-nao-fica-embaixo-do-cabecalho.spec.ts`
           * pegou, e a versão anterior passava por sorte de altura de página.
           *
           * ⚠️ **A capacidade NÃO se perde, e essa é a condição para isto ser
           * legítimo:** o rodapé e a página de contato trazem "Traçar rota" e o
           * endereço, os dois abrindo o mapa da Google numa aba. Verificado
           * percorrendo a página por teclado: zero paradas no quadro, e as duas
           * ligações continuam alcançáveis.
           *
           * Se um dia o mapa deixar de ter um link equivalente ao lado, isto
           * vira defeito — a permissão depende do link existir.
           */
          tabIndex={-1}
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
          className="h-full w-full"
        />
      ) : null}
    </div>
  );
}
