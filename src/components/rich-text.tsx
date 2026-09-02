import { Fragment } from "react";
import { Link } from "@/i18n/navigation";
import { ehLinkSeguro } from "@/lib/safe-link";

/**
 * Lightweight, dependency-free renderer for the lightly-marked-up text stored in
 * `LocalizedRichText` content fields (one block per array element / per line in
 * the admin editor). It renders semantic HTML — `<h2>`/`<h3>`, `<ul>`, `<strong>`,
 * `<em>`, `<a>` — which is what search engines read, so emphasis written by
 * editors becomes real SEO signal rather than decorative styling.
 *
 * Supported per-block syntax:
 *   `## Heading`         → <h2>
 *   `### Heading`        → <h3>
 *   `- item` / `* item`  → grouped into a single <ul>
 *   anything else        → <p>
 *
 * Supported inline syntax (inside any block):
 *   `**bold**`                  → <strong>
 *   `*italic*` / `_italic_`     → <em>
 *   `[label](/path)`            → localized <Link> (internal) or <a> (external)
 */

const INLINE =
  /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|_([^_]+)_/g;

/** Parse inline emphasis/links within a single block of text. */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      nodes.push(
        <Fragment key={key++}>{text.slice(lastIndex, start)}</Fragment>,
      );
    }

    const [, linkLabel, linkHref, bold, italicStar, italicUnderscore] = match;
    if (linkLabel && linkHref) {
      nodes.push(
        linkHref.startsWith("/") ? (
          <Link
            key={key++}
            href={linkHref}
            className="font-medium text-brand underline-offset-4 hover:underline"
          >
            {linkLabel}
          </Link>
        ) : ehLinkSeguro(linkHref) ? (
          <a
            key={key++}
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand underline-offset-4 hover:underline"
          >
            {linkLabel}
          </a>
        ) : (
          // Destino recusado (`javascript:`, `data:`, ou coisa sem esquema
          // reconhecível): sobra o rótulo como texto. Some o link, fica a
          // frase — melhor que uma página quebrada, e muito melhor que um
          // `href` que executa código no clique.
          <Fragment key={key++}>{linkLabel}</Fragment>
        ),
      );
    } else if (bold) {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {bold}
        </strong>,
      );
    } else if (italicStar || italicUnderscore) {
      nodes.push(
        <em key={key++} className="italic">
          {italicStar || italicUnderscore}
        </em>,
      );
    }

    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  }

  return nodes;
}

/** Render an ordered list of marked-up blocks into semantic HTML. */
export function RichText({
  blocks,
  className,
  nivelAcima = 1,
}: {
  blocks: string[];
  className?: string;
  /**
   * Nível do título mais profundo que a PÁGINA já colocou acima deste texto.
   * `/novidades/[slug]` renderiza o corpo logo abaixo do `<h1>` do artigo, daí
   * o padrão 1.
   */
  nivelAcima?: number;
}) {
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  /*
   * ⚠️ O nível do título vem de dado editável, e por isso é normalizado aqui.
   *
   * `## ` vira `<h2>` e `### ` vira `<h3>`. Se o texto cadastrado no painel
   * começar com `### `, a página sai com h1 → h3: o leitor de tela anuncia um
   * nível que não existe e quem navega por títulos perde a estrutura. Nada em
   * `typecheck`, `lint` ou `build` vê isso, porque depende do conteúdo.
   *
   * A correção fica no renderizador, e não numa validação na hora de salvar,
   * por um motivo prático: quem escreve é o dono do restaurante, não um editor
   * de HTML. Recusar o texto dele por causa de um `#` a mais seria transferir
   * um problema nosso para ele. Aqui o título desce no máximo um degrau por
   * vez, e a página sai correta escreva ele o que escrever.
   */
  let ultimoNivel = nivelAcima;

  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    list = [];
    out.push(
      <ul
        key={`ul-${out.length}`}
        className="flex list-disc flex-col gap-2 pl-6 text-base text-muted-foreground sm:text-lg"
      >
        {items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ul>,
    );
  };

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    if (/^[-*]\s+/.test(block)) {
      list.push(block.replace(/^[-*]\s+/, ""));
      continue;
    }
    flushList();

    if (block.startsWith("### ") || block.startsWith("## ")) {
      const pedido = block.startsWith("### ") ? 3 : 2;
      // Desce no máximo um degrau por vez. Em linha, e não num ajudante: um
      // fechamento que reatribui a variável pode sobreviver ao render, e a
      // regra de pureza do React proíbe — aqui o laço é código de render
      // direto, igual ao `out.push` logo abaixo.
      const nivel = Math.min(pedido, ultimoNivel + 1);
      ultimoNivel = nivel;
      const Titulo = (nivel === 3 ? "h3" : "h2") as "h2" | "h3";
      // O peso visual acompanha o nível de fato emitido: um título que virou
      // `h2` não pode continuar parecendo um `h3`.
      const estilo =
        nivel === 3
          ? "text-xl font-semibold tracking-tight"
          : "text-2xl font-bold tracking-tight sm:text-3xl";
      out.push(
        <Titulo key={`h${nivel}-${out.length}`} className={estilo}>
          {renderInline(block.slice(pedido === 3 ? 4 : 3))}
        </Titulo>,
      );
    } else {
      out.push(
        <p key={`p-${out.length}`} className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          {renderInline(block)}
        </p>,
      );
    }
  }
  flushList();

  return <div className={className}>{out}</div>;
}
