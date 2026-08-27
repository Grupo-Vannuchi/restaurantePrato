import Link from "next/link";

import { siteConfig } from "@/config/site";
import pt from "@/messages/pt.json";

/**
 * Global fallback for requests that don't match any locale segment. Renders its
 * own document because it lives above the locale root layout — não há
 * `app/layout.tsx` neste projeto, então aqui não chega nem o CSS global nem o
 * contexto do next-intl.
 *
 * As duas consequências disso já produziram um defeito: esta página nasceu em
 * inglês, com o índigo da agência no link, e ficou assim num site que não tem
 * outro idioma. Ninguém abre a página de erro ao revisar um site, e nenhum
 * comando do projeto a renderiza.
 *
 * Por isso ela não repete texto nem cor:
 *
 * - o texto vem do `pt.json`, o mesmo catálogo do resto do site, importado
 *   direto porque `getTranslations()` precisa de um locale que aqui não existe;
 * - as cores vêm de `siteConfig.theme`, então a troca de paleta do PR 2
 *   chega aqui sozinha, em vez de deixar para trás uma página fora da marca.
 */
export default function GlobalNotFound() {
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
        <p style={{ fontSize: "4rem", fontWeight: 700, margin: 0, color: brand }}>
          404
        </p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          {pt.notFound.title}
        </h1>
        <p style={{ maxWidth: "28rem", opacity: 0.8, margin: 0 }}>
          {pt.notFound.description}
        </p>
        <Link
          href="/"
          style={{
            marginTop: "0.5rem",
            padding: "0.65rem 1.25rem",
            borderRadius: "0.5rem",
            background: brand,
            color: brandForeground,
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.95rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {pt.notFound.back}
        </Link>
      </body>
    </html>
  );
}
