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

## Atualização — 2026-08-20, tarde: a metade que falta fica aberta, de propósito

A pergunta "adotar o nonce?" vinha sendo tratada como voto. Hoje ela foi
**medida**, e a medição decidiu.

**O que o nonce custaria, exato:** as 31 páginas pré-renderizadas. Não é
estimativa — é o que o `build` imprime. Com nonce, cada visita passa a acordar
uma função no servidor, para sempre.

**Por que hash não substitui o nonce.** A página `/pt` publicada carrega **24
scripts inline**. Um é o restaurador de tema (literal fixo, esse até daria para
hashear). Os outros 23 são `self.__next_f.push(...)` — a carga do React que o
**próprio Next** injeta, e cujo conteúdo muda a cada página e a cada build.
Hash exigiria recalcular a lista inteira por página, e o cabeçalho é uma string
só no `next.config.ts`. Ou seja: `'unsafe-inline'` ou nonce, não há terceira via.

**O que o nonce compraria — medido, não suposto.** Varredura em todo ponto onde
dado guardado vira HTML:

| Ponto | Origem do dado | Situação |
|---|---|---|
| `layout.tsx` (restaurador de tema) | literal no código | sem entrada |
| `theme-style.tsx` | `siteConfig.theme` (código) | sem entrada |
| `json-ld.tsx` | **título/descrição de novidade** | **era buraco real — fechado** |
| `rich-text.tsx` (`href`) | destino escrito na novidade | lista de permissão |
| `testimonials.tsx` (`sourceUrl`) | painel | lista de permissão no `zod` |
| `src` de imagem (7 pontos) | painel | preso pelo `img-src` da CSP |

O do JSON-LD era real e foi confirmado num parser de HTML de verdade: sem
escape, o DOM enxerga **2 elementos `<script>`** e o segundo executa; com
`serializarJsonLd`, enxerga 1.

⚠️ **Uma crença que a medição derrubou.** Achávamos que `[x](javascript:…)` no
texto de uma novidade executava ao clique. **Não executava:** o React troca o
destino por um `throw` antes de renderizar, e não distingue maiúscula de
minúscula. A correção do `rich-text` continua valendo — o React deixa `data:`
passar, e a lista de permissão fecha isso —, mas é defesa em profundidade, não
buraco aberto. Ficou registrado porque o erro foi de classificação de gravidade,
e esse tipo de erro se repete.

**Decisão:** manter `'unsafe-inline'` e **não** adotar o nonce. Com todos os
pontos de entrada fechados na origem, o nonce compraria uma manta genérica
contra um risco que hoje exige sessão de admin comprometida — e cobraria por
isso o modo estático, em toda visita, para sempre. Fechar na origem é mais
barato e mais preciso.

**Isto é condicional, e a condição é o que reabre a discussão.** Reavaliar
quando entrar (a) qualquer script de terceiro — analytics, pixel, chat; (b)
qualquer escrita **pública** que chegue ao HTML — hoje só o formulário de
contato escreve sem login, e o que ele grava nunca é renderizado no site; ou
(c) comentários, avaliações abertas ou qualquer campo que o visitante preencha
e outro visitante leia. Enquanto nada disso existir, a guarda são os testes:
`test/json-ld-escape.test.ts`, `test/rich-text-links.test.ts` e
`test/testimonial-url.test.ts`.
