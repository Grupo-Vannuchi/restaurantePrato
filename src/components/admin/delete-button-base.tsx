"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

/**
 * Botão de excluir do painel — a base única dos cinco.
 *
 * Os cinco botões (foto, novidade, categoria, item, depoimento) eram cópias
 * byte a byte, diferindo só no namespace, na ação e na chave de confirmação. O
 * defeito que esta base fecha estava nos cinco ao mesmo tempo, e consertar cinco
 * vezes é convidar a divergência de volta — o próximo conserto tocaria quatro
 * arquivos e esqueceria um. Mesmo motivo pelo qual o card de fechamento das
 * páginas públicas virou um componente só.
 *
 * ⚠️ **`useState`, não `useTransition`** — e essa é a raiz do defeito, não uma
 * preferência. `startTransition(async () => { await excluir(id); router.refresh() })`
 * **descarta o valor de retorno por construção**: não há como ler `{ ok }` de
 * dentro dele. Era por isso que o fracasso passava batido.
 *
 * Duas consequências que a base garante:
 *
 * - **Fracasso não encena sucesso.** `router.refresh()` só roda quando a
 *   exclusão deu certo. Antes ele rodava sempre, então a tela se comportava
 *   igualzinho nos dois casos: a lista recarregava, o item continuava lá, e
 *   nada explicava por quê. Não era ausência de aviso — era um aviso errado.
 * - **Rejeição vira mensagem, não tela branca.** Dentro de `startTransition`
 *   uma promessa rejeitada não é capturada por nada e sobe para o error
 *   boundary, derrubando a página. Aqui ela é uma linha vermelha ao lado do
 *   botão, e o botão volta a aceitar nova tentativa.
 *
 * As ações de exclusão devolvem `{ ok: boolean }`, sem código de erro — por isso
 * a mensagem é uma só, recebida pronta. Quem chama traduz; a base não conhece
 * namespace.
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
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm(confirmMessage)) return;
    setErro(null);
    setPending(true);
    try {
      const res = await onDelete();
      if (res.ok) router.refresh();
      else setErro(errorMessage);
    } catch {
      // A ação nem chegou a responder: rede caída, servidor reiniciando, sessão
      // derrubada no meio. Sem este ramo a rejeição derrubaria a tela.
      setErro(errorMessage);
    } finally {
      // Em `finally`: o botão precisa voltar a funcionar mesmo no fracasso, ou
      // a pessoa fica sem nenhuma forma de tentar de novo.
      setPending(false);
    }
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
