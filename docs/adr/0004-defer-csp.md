# 0004 — Defer Content-Security-Policy

- **Status:** Accepted
- **Date:** 2026-06

## Context

The `security-review` skill recommends a strict CSP to mitigate XSS. We added the
safe baseline headers (HSTS, X-Frame-Options, X-Content-Type-Options,
Referrer-Policy, Permissions-Policy) in `next.config.ts`, but a naive CSP would
**break** the site: it emits inline JSON-LD (`<script type="application/ld+json">`),
loads external fonts/images (Google Drive, Unsplash), and Next injects inline
hydration scripts that need a per-request **nonce**.

## Decision

Ship the safe headers now and **defer the CSP** to its own task: a nonce
middleware + an allowlist for the legitimate inline/external sources + per-page
testing.

## Consequences

- ✅ Real, non-breaking security hardening today.
- ⚠️ XSS mitigation via CSP is still missing — tracked as a known gap in
  `SECURITY.md`. Do it as a dedicated, tested change, not a quick add.

## Atualização — 2026-08-20

**Metade entrou.** A decisão original tratava a CSP como tudo-ou-nada, e não
era: só `script-src` depende de nonce. Tudo o mais foi para o `next.config.ts`
e está no ar — `default-src 'self'`, `base-uri`, `form-action`,
`frame-ancestors`, `object-src`, e `img-src`/`font-src`/`connect-src`/`frame-src`
escopados ao que o site de fato carrega. O build confirmou que o desenho se
paga: as 31 páginas seguem pré-renderizadas, o que um nonce por requisição
teria acabado.

**O que continua aberto é a parte que mitiga XSS:** `script-src` carrega
`'unsafe-inline'`, sem o qual a política bloquearia o JSON-LD e os scripts de
hidratação do Next. Fechar isso exige o nonce, e o nonce exige aceitar a perda
do modo estático — ou uma alternativa que ainda não foi desenhada.

**Custo pago no caminho, que vale registrar:** o rodapé embute o Google Maps
num iframe, e a política entrou sem `frame-src`. O navegador recusou o quadro,
o mapa virou um retângulo vazio no site inteiro, e **nada acusou no servidor**:
build verde, HTTP 200. Quem pegou foi `e2e/csp.spec.ts`, lendo o console do
navegador — e mesmo ele só viu porque a `/galeria` é curta o bastante para
mostrar o rodapé sem rolagem, já que o iframe é preguiçoso. O teste agora rola
até o fim antes de conferir.
