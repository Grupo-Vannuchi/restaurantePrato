import * as React from "react";
import { cn } from "@/lib/utils";

const fieldStyles =
  "w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-brand aria-[invalid=true]:border-danger";

/**
 * Dica e erro entram POR PROP, não como elementos soltos ao lado do campo.
 *
 * Antes, cada formulário renderizava a dica e o erro como parágrafos próprios
 * depois do campo. Eles apareciam na tela e não existiam para quem navega por
 * foco: `aria-describedby` não aparecia uma única vez em `src/`. O leitor de
 * tela anunciava "Slug, edição, inválido" e parava — a pessoa sabia que errou,
 * não o quê.
 *
 * Fiar a ligação à mão nos 35 lugares seria o mesmo trabalho e voltaria a
 * divergir no próximo campo criado. Aqui os ids são gerados e ligados sozinhos,
 * e `test/campo-com-erro-anunciado.test.tsx` reprova quem renderizar
 * `<FieldError>` solto de novo.
 */
type ExtrasDoCampo = {
  /** Instrução de formato. Fica ligada ao campo, não solta ao lado dele. */
  hint?: string;
  /** Mensagem de erro. Marca o campo como inválido e é anunciada. */
  error?: string;
};

/**
 * Ids da dica e do erro, derivados do id do campo (ou de um gerado).
 *
 * `externo` é SOMADO, não substituído: há campo cuja dica precisa morar fora do
 * componente por causa do layout (o seletor de ícone fica num flex com a
 * prévia), e substituir faria a dica ou o erro sumirem da leitura.
 */
function useDescricao(
  id: string | undefined,
  hint?: string,
  error?: string,
  externo?: string,
) {
  const gerado = React.useId();
  const base = id ?? gerado;
  const hintId = hint ? `${base}-dica` : null;
  const errorId = error ? `${base}-erro` : null;
  // A ordem é a de leitura: primeiro a instrução, depois o que deu errado.
  const describedBy = [externo, hintId, errorId].filter(Boolean).join(" ");
  return { base, hintId, errorId, describedBy: describedBy || undefined };
}

function Auxiliares({
  hintId,
  hint,
  errorId,
  error,
}: {
  hintId: string | null;
  errorId: string | null;
  hint?: string;
  error?: string;
}) {
  return (
    <>
      {hint ? (
        <p id={hintId ?? undefined} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={errorId ?? undefined}>{error}</FieldError> : null}
    </>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & ExtrasDoCampo
>(function Input({ className, hint, error, id, "aria-describedby": descrito, "aria-invalid": invalido, ...props }, ref) {
  const { base, hintId, errorId, describedBy } = useDescricao(
    id,
    hint,
    error,
    descrito,
  );
  return (
    <>
      <input
        ref={ref}
        id={base}
        aria-invalid={error ? true : invalido}
        aria-describedby={describedBy}
        className={cn(fieldStyles, className)}
        {...props}
      />
      <Auxiliares hintId={hintId} hint={hint} errorId={errorId} error={error} />
    </>
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & ExtrasDoCampo
>(function Textarea({ className, hint, error, id, "aria-describedby": descrito, "aria-invalid": invalido, ...props }, ref) {
  const { base, hintId, errorId, describedBy } = useDescricao(
    id,
    hint,
    error,
    descrito,
  );
  return (
    <>
      <textarea
        ref={ref}
        id={base}
        aria-invalid={error ? true : invalido}
        aria-describedby={describedBy}
        className={cn(fieldStyles, "min-h-32 resize-y", className)}
        {...props}
      />
      <Auxiliares hintId={hintId} hint={hint} errorId={errorId} error={error} />
    </>
  );
});

/**
 * `<select>` com a mesma ligação de dica e erro dos outros campos.
 *
 * Existe também para acabar com a constante `selectStyles`, que estava copiada
 * em quatro arquivos com o mesmo valor — e um deles já divergia, mantendo a cor
 * de borda antiga.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & ExtrasDoCampo
>(function Select({ className, hint, error, id, "aria-describedby": descrito, "aria-invalid": invalido, children, ...props }, ref) {
  const { base, hintId, errorId, describedBy } = useDescricao(
    id,
    hint,
    error,
    descrito,
  );
  return (
    <>
      <select
        ref={ref}
        id={base}
        aria-invalid={error ? true : invalido}
        aria-describedby={describedBy}
        className={cn(fieldStyles, className)}
        {...props}
      >
        {children}
      </select>
      <Auxiliares hintId={hintId} hint={hint} errorId={errorId} error={error} />
    </>
  );
});

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium", className)}
      {...props}
    />
  );
}

/**
 * ⚠️ Uso interno. Passe `error` para `Input`/`Textarea` em vez de renderizar
 * isto direto — só assim o erro fica ligado ao campo e é anunciado.
 *
 * `role="alert"` porque a mensagem entra no DOM DEPOIS da ação: sem ele, quem
 * não está olhando para aquele pedaço da tela nunca fica sabendo que falhou, e
 * a única evidência do erro é a cor.
 */
export function FieldError({
  id,
  children,
}: {
  id?: string;
  children?: string;
}) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-danger">
      {children}
    </p>
  );
}
