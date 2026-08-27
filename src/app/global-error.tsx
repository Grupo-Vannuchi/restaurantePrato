"use client";

import { useEffect } from "react";

import { siteConfig } from "@/config/site";
import pt from "@/messages/pt.json";

/**
 * Último recurso: erro acima do layout de locale, onde nem o CSS global nem o
 * contexto do next-intl existem — por isso o documento próprio, o texto lido
 * direto do catálogo e as cores vindas de `siteConfig`, como em
 * `app/not-found.tsx`.
 *
 * Este limite substitui a página inteira, então precisa se bastar: se ele
 * próprio depender de algo que quebrou, o visitante fica com a tela em branco.
 * Nada aqui busca dado, traduz ou importa componente do site.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro global:", error.digest ?? error.message);
  }, [error]);

  const { background, foreground, brand, brandForeground } =
    siteConfig.theme;

  return (
    <html lang="pt-BR">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          margin: 0,
          background,
          color: foreground,
          fontFamily: "Georgia, 'Times New Roman', serif",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          {pt.errorPage.title}
        </h1>
        <p style={{ maxWidth: "28rem", opacity: 0.8, margin: 0 }}>
          {pt.errorPage.description}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            padding: "0.65rem 1.25rem",
            border: "none",
            borderRadius: "0.5rem",
            background: brand,
            color: brandForeground,
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {pt.errorPage.retry}
        </button>
      </body>
    </html>
  );
}
