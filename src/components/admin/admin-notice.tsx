"use client";

import { useTranslations } from "next-intl";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * A região que anuncia o resultado das ações do painel — e sobrevive a elas.
 *
 * O problema que ela resolve não é "faltava uma mensagem". É que **quem
 * anunciaria era destruído pela própria ação**: o botão de excluir some junto
 * com a linha que apagou, e com ele qualquer aviso que estivesse ali dentro. Por
 * isso o aviso mora acima, no painel — e sobrevive porque `router.refresh()`
 * recarrega os componentes de servidor sem descartar o estado dos de cliente.
 *
 * Dois detalhes que parecem cosméticos e não são:
 *
 * - **A região fica no DOM desde sempre, vazia.** Uma região viva só é anunciada
 *   de forma confiável se já existir quando o texto muda; criá-la junto com a
 *   mensagem faz o leitor de tela perder o anúncio.
 * - **`aria-live="polite"`, não `assertive`.** Confirmação de algo que a pessoa
 *   acabou de pedir não interrompe o que ela está lendo. Erro é que interrompe,
 *   e esse continua saindo em `alert`, ao lado do botão.
 *
 * A mensagem permanece até a próxima ação, de propósito: ela é o registro do que
 * aconteceu por último, e some sozinha no instante em que deixa de ser verdade.
 */
type Aviso = {
  /** Anuncia o resultado e leva o foco para a região. */
  announce: (message: string) => void;
};

const AdminNoticeContext = createContext<Aviso | null>(null);

/** Null fora do provedor — quem chama decide se anuncia ou segue calado. */
export function useAdminNotice(): Aviso | null {
  return useContext(AdminNoticeContext);
}

export function AdminNotice({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin.nav");
  const rotulo = t("noticeRegion");
  const [mensagem, setMensagem] = useState("");
  const regiaoRef = useRef<HTMLDivElement | null>(null);

  const focoPendente = useRef(false);

  const announce = useCallback((message: string) => {
    focoPendente.current = true;
    setMensagem(message);
  }, []);

  // O foco vai para cá porque o elemento que o tinha deixou de existir: a
  // escolha não é entre mover e não mover, é entre um destino pensado e o
  // `<body>`, que joga a pessoa para o topo do documento sem pista nenhuma.
  //
  // Em efeito, e não dentro do `announce`: `setMensagem` é agendado, então
  // focar ali levava a pessoa para uma região ainda VAZIA. Funcionava por
  // acidente — o `aria-live` da atualização seguinte cobria o anúncio —, e
  // acidente não é desenho.
  useEffect(() => {
    if (!focoPendente.current) return;
    focoPendente.current = false;
    regiaoRef.current?.focus();
  }, [mensagem]);

  return (
    <AdminNoticeContext.Provider value={{ announce }}>
      <div
        ref={regiaoRef}
        role="status"
        aria-live="polite"
        // A região recebe foco de propósito, então precisa se apresentar: sem
        // nome, quem chega nela ouve só o conteúdo e não sabe para onde foi.
        aria-label={rotulo}
        tabIndex={-1}
        className={
          mensagem
            ? "mb-4 rounded-lg border border-success/40 bg-success/10 px-4 py-2.5 text-sm text-success"
            : undefined
        }
      >
        {mensagem}
      </div>
      {children}
    </AdminNoticeContext.Provider>
  );
}
