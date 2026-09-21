# Plano de Ação SEO — N8X Marketing

**Site:** https://n8xmarketing.com.br · **Nota geral:** 94/100 (Excelente)
**Data:** 26/06/2026

> Todo o plano técnico anterior foi entregue e **verificado em produção**. Não há nada crítico ou urgente em aberto. Os itens abaixo são refinamentos e estratégia.

---

## 🥇 Prioridade Alta
Nenhum item crítico em aberto. ✅ As correções da semana já estão live e verificadas:
- Open Graph site-wide restaurado (PR #67).
- HTTP 500 nas páginas de informação corrigido (PR #61).
- TBT de desktop pelo Google Maps resolvido com lazy-load via IntersectionObserver (PR #65).
- Acessibilidade (touch targets) 96 → 100; LCP mobile do hero 3,2 s → ~2,7 s.

---

## 🥈 Prioridade Média — esta/próxima semana

### 1. Medir Core Web Vitals em corrida fresca
A API do PageSpeed deu rate-limit (sem chave). Rodar manualmente mobile + desktop em https://pagespeed.web.dev/?url=https://n8xmarketing.com.br e confirmar: LCP < 2,5 s · INP < 200 ms · CLS < 0,1. Atenção ao **LCP mobile (~2,7 s, limítrofe)**.

### 2. (Opcional) `twitter:site` / `twitter:creator`
Adicionar o handle do X/Twitter da agência (se houver) ao bloco `twitter` via `baseOpenGraph`. Baixo impacto, ~5 min.

---

## 🥉 Prioridade Baixa — backlog / estratégico

### 3. CSP (Content-Security-Policy)
Único header de segurança faltando (85 → 100). Dívida consciente documentada em [`docs/adr/0004-defer-csp.md`](../adr/0004-defer-csp.md) — exige nonce-middleware por causa do JSON-LD inline. Entregar como mudança própria, com teste.

### 4. Cadência editorial — maior alavanca orgânica
A estrutura está pronta (Article schema completo, sitemap, autor-pessoa). O ganho de tráfego agora vem de **publicar com regularidade** em `/novidades`, mirando cauda longa local: "restaurante no centro de Santos", "cafeteria no centro de Santos", "onde almoçar no centro de Santos".

> ⚠️ Palavras-chave **provisórias**: valem enquanto a única coisa confirmada
> sobre o Restaurante Prato é que ele é restaurante e cafeteria no Centro de
> Santos. A estratégia definitiva depende do posicionamento que vier junto com a
> copy do cliente (PR 3).

> ⚠️ Este documento é anterior ao rebrand: foi escrito para a agência. Os 150 artigos que ainda estão no banco são conteúdo de SEO da n8x e saem no PR 7, junto com o reset. A cadência editorial só começa quando houver conteúdo do restaurante.

---

## Resumo

| Prioridade | Itens | Esforço | Impacto |
|-----------|-------|---------|---------|
| 🥇 Alta | — (nada crítico) | — | — |
| 🥈 Média | Medir CWV fresco · twitter:site | Minutos | Médio |
| 🥉 Baixa | CSP · cadência de conteúdo | Variado | Médio→Alto (conteúdo) |

**Veredito:** O trabalho técnico de SEO está concluído e estável em produção (94/100). O foco daqui pra frente deixa de ser técnico e passa a ser **conteúdo e autoridade** (cadência editorial), com os CWV a confirmar em campo.
