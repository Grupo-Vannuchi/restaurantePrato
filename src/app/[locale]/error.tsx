"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

/**
 * Limite de erro das páginas públicas.
 *
 * Sem este arquivo, uma exceção em tempo de execução — o banco fora do ar no
 * meio de uma consulta, por exemplo — entrega ao visitante a tela padrão do
 * Next: fundo branco, texto em inglês e nenhuma saída além do botão de voltar
 * do navegador. Aqui ele encontra a marca, o motivo em português e dois
 * caminhos: tentar de novo ou ir para o início.
 *
 * Precisa ser Componente de Cliente — é exigência do React para um limite de
 * erro, que roda no navegador depois que a renderização falhou.
 */
export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // O `digest` é o identificador que a Vercel imprime no log do servidor. Sem
    // registrá-lo aqui, não há como ligar o que o visitante viu ao que o
    // servidor gravou — a mensagem real fica retida de propósito, para não
    // vazar detalhe interno na tela.
    console.error("Erro na página pública:", error.digest ?? error.message);
  }, [error]);

  const t = useTranslations("errorPage");

  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-5 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="max-w-md text-pretty text-muted-foreground">
        {t("description")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>{t("retry")}</Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          {t("back")}
        </Link>
      </div>
    </Container>
  );
}
