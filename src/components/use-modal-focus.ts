"use client";

import { useEffect, useRef, type RefObject } from "react";

/** O que o navegador considera alcançável por tabulação, dentro do diálogo. */
const FOCAVEIS =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Gestão de foco de uma janela modal: entra, fica presa, sai pelo Esc e volta.
 *
 * `role="dialog"` e `aria-modal="true"` são uma PROMESSA à tecnologia
 * assistiva — a de que o resto da página está inerte enquanto a janela estiver
 * aberta. Declarar sem mover o foco torna a promessa falsa: o cursor continua
 * atrás do véu, a tabulação passeia pela página escondida, e os controles da
 * janela (fechar, navegar) ficam inalcançáveis por teclado.
 *
 * O contrário também acontece e é pior: uma janela que não declara nada, como
 * era a do QR Code. Aí quem usa leitor de tela não recebe aviso nenhum de que
 * algo abriu, e quem navega por teclado não tem saída — o botão de fechar está
 * dentro de uma janela onde o foco nunca entrou.
 *
 * As quatro garantias, num lugar só:
 *
 * - o foco entra no primeiro elemento alcançável (normalmente o fechar, que é
 *   o que mais se precisa ter à mão ao entrar);
 * - Tab e Shift+Tab circulam dentro da janela em vez de escapar;
 * - Esc fecha;
 * - ao fechar, o foco volta para quem abriu — cair no `<body>` devolve a pessoa
 *   ao topo do documento e faz perder o lugar na página.
 *
 * Devolve a ref que deve ser posta no elemento do diálogo.
 */
export function useModalFocus({
  open,
  onClose,
  lockScroll = true,
}: {
  /** Se a janela está aberta. */
  open: boolean;
  /** Chamado no Esc. Pode ser recriado a cada render sem problema. */
  onClose: () => void;
  /** Trava a rolagem do fundo enquanto aberta. */
  lockScroll?: boolean;
}): RefObject<HTMLDivElement | null> {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const gatilhoRef = useRef<HTMLElement | null>(null);
  const fecharRef = useRef(onClose);

  // O `onClose` vive numa ref para o efeito abaixo NÃO depender dele. Quem chama
  // costuma passar uma arrow function nova a cada render; se ela entrasse nas
  // dependências, o efeito se desmontaria e remontaria a cada render — e a
  // limpeza devolve o foco ao gatilho, então o foco sairia da janela sozinho,
  // repetidamente. Sincronizado em efeito, e não durante o render, porque o
  // React Compiler exige render puro.
  useEffect(() => {
    fecharRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Guardado antes de mover o foco: neste ponto o elemento ativo ainda é quem
    // abriu a janela, porque o React não mexe no foco por conta própria.
    gatilhoRef.current = document.activeElement as HTMLElement | null;

    const focaveis = (): HTMLElement[] =>
      [...dialog.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(
        (el) => !el.hasAttribute("disabled"),
      );

    focaveis()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return fecharRef.current();
      if (e.key !== "Tab") return;

      const alvos = focaveis();
      if (alvos.length === 0) return;
      const primeiro = alvos[0]!;
      const ultimo = alvos[alvos.length - 1]!;
      const ativo = document.activeElement;
      const dentro = ativo instanceof Node && dialog.contains(ativo);

      // Circular: chegando à ponta, o Tab volta à outra ponta em vez de sair.
      // Se o foco estiver fora (nunca deveria), traz de volta.
      if (e.shiftKey && (!dentro || ativo === primeiro)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (!dentro || ativo === ultimo)) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const rolagemAnterior = document.body.style.overflow;
    if (lockScroll) document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      if (lockScroll) document.body.style.overflow = rolagemAnterior;
      gatilhoRef.current?.focus();
      gatilhoRef.current = null;
    };
  }, [open, lockScroll]);

  return dialogRef;
}
