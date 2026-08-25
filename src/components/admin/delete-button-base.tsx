"use client";

import { Trash2 } from "lucide-react";
import { useAdminAction } from "@/components/admin/use-admin-action";

/**
 * Botão de excluir do painel — a base única dos cinco.
 *
 * Os cinco botões (foto, novidade, categoria, item, depoimento) eram cópias byte
 * a byte, diferindo só no namespace, na ação e na chave de confirmação. O defeito
 * que esta base fecha estava nos cinco ao mesmo tempo, e consertar cinco vezes é
 * convidar a divergência de volta — o próximo conserto tocaria quatro arquivos e
 * esqueceria um. Mesmo motivo pelo qual o card de fechamento das páginas
 * públicas virou um componente só.
 *
 * A conversa com o servidor mora em `useAdminAction`, junto com a dos botões da
 * tela de contatos. Aqui fica só a aparência: o botão, a confirmação e o lugar
 * onde a mensagem de falha aparece.
 */
export function DeleteButtonBase({
  label,
  confirmMessage,
  errorMessage,
  onDelete,
}: {
  /** Texto do botão, que também é seu rótulo acessível. */
  label: string;
  /** Pergunta do `confirm()` antes de apagar. */
  confirmMessage: string;
  /** Mostrada ao lado do botão quando a exclusão não acontece. */
  errorMessage: string;
  /** A server action já com o id aplicado. */
  onDelete: () => Promise<{ ok: boolean }>;
}) {
  const { pending, erro, run } = useAdminAction(errorMessage);

  function onClick() {
    if (!window.confirm(confirmMessage)) return;
    void run(onDelete);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={label}
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-60"
      >
        <Trash2 className="size-4" />
        {label}
      </button>
      {erro ? <span className="text-xs text-red-500">{erro}</span> : null}
    </div>
  );
}
