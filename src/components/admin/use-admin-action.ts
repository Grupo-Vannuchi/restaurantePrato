"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Chamar uma server action do painel sem engolir o resultado.
 *
 * Sete lugares do painel faziam a mesma dança de dez linhas — os cinco botões
 * de excluir, o de marcar contato e o de etiquetar — e os sete tinham o mesmo
 * defeito, porque a dança estava escrita sete vezes. Aqui ela mora uma vez só.
 *
 * ⚠️ O que este gancho existe para impedir é o padrão
 * `startTransition(async () => { await acao(); router.refresh() })`. Ele parece
 * correto e é a sugestão natural do React para uma ação que atualiza a tela, mas
 * **descarta o valor de retorno do callback por construção**: o `{ ok }` lido lá
 * dentro morre ali, e uma promessa rejeitada não é capturada por nada — sobe
 * para o error boundary e derruba a página em vez de virar uma linha de aviso.
 *
 * As três garantias:
 *
 * - `router.refresh()` **só no sucesso**. Antes ele rodava sempre, e a tela se
 *   comportava igual nos dois casos: a lista recarregava, nada mudava, e nada
 *   explicava. Não era ausência de aviso — era um aviso errado.
 * - Rejeição vira `erro`, não tela branca.
 * - `pending` volta a `false` no `finally`, para haver como tentar de novo.
 *
 * As ações do painel devolvem `{ ok: boolean }` sem código de erro, por isso a
 * mensagem é uma só e chega pronta: quem chama traduz, o gancho não conhece
 * namespace.
 */
export function useAdminAction(errorMessage: string): {
  pending: boolean;
  erro: string | null;
  run: (action: () => Promise<{ ok: boolean }>) => Promise<void>;
} {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function run(action: () => Promise<{ ok: boolean }>): Promise<void> {
    setErro(null);
    setPending(true);
    try {
      const res = await action();
      if (res.ok) router.refresh();
      else setErro(errorMessage);
    } catch {
      setErro(errorMessage);
    } finally {
      setPending(false);
    }
  }

  return { pending, erro, run };
}
