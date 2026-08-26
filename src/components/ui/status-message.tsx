import { cn } from "@/lib/utils";

/**
 * Mensagem de resultado de uma ação — com o papel ARIA que o significado exige.
 *
 * O painel devolvia resultado em `<span>` e `<p>` mudos, inseridos no DOM
 * DEPOIS da ação. Quem não está olhando para aquele pedaço da tela nunca ficava
 * sabendo que algo falhou: a única evidência era a cor.
 *
 * O pior caso era a configuração de notificação, onde a confirmação de sucesso
 * e o erro de salvamento dividiam o MESMO `<span>`, escolhido por cor. A pessoa
 * clicava em "Salvar", o botão voltava de "Salvando" para "Salvar", e não havia
 * sinal nenhum de qual dos dois tinha acontecido.
 *
 * Aqui o papel segue o tom, e não a escolha de quem chama: erro é `alert`
 * (interrompe a leitura, porque exige ação), sucesso e aviso são `status` (não
 * interrompem). Errar isso é anunciar um sucesso como se fosse emergência.
 *
 * As três cores são tokens por tema, medidos: os `red-500`, `emerald-600` e
 * `amber-600` do Tailwind reprovavam em contraste sobre o card claro — e o
 * vermelho reprovava também no escuro.
 */
const TONS = {
  error: { role: "alert", cor: "text-danger" },
  success: { role: "status", cor: "text-success" },
  warning: { role: "status", cor: "text-warning" },
} as const;

export function StatusMessage({
  tone,
  children,
  className,
}: {
  tone: keyof typeof TONS;
  children?: string | null;
  className?: string;
}) {
  if (!children) return null;
  const { role, cor } = TONS[tone];
  return (
    <span role={role} className={cn("text-xs", cor, className)}>
      {children}
    </span>
  );
}
