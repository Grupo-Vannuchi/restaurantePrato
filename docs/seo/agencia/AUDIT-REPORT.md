# Auditoria de SEO Completa — N8X Marketing

**Site:** https://n8xmarketing.com.br
**Código-fonte:** Next.js 16 · App Router · next-intl
**Data da auditoria:** 26/06/2026
**Tipo:** Auditoria full (produção ao vivo + cruzamento com o código-fonte)
**Auditoria anterior:** 25/06/2026 (88 → 95 após correção de Open Graph)
**Método:** LLM-first + scripts da skill SEO + verificação direta (curl/Playwright) em produção

---

## Pontuação Geral: 94 / 100 — Excelente

| Categoria | Peso | Nota | Conf. | Avaliação |
|-----------|:----:|:----:|:-----:|-----------|
| Technical SEO | 25% | 96 | Confirmado | HTTPS, canonical, hreflang, robots, sitemap, sem 500 |
| Conteúdo & E-E-A-T | 20% | 90 | Confirmado | Autor-pessoa, datas, org-mãe, 177 URLs, bilíngue |
| On-Page SEO | 15% | 93 | Confirmado | Title/desc/H1/canonical + **Open Graph completo** |
| Schema / Dados estruturados | 15% | 95 | Confirmado | Grafo JSON-LD; Article c/ datas+autor+imagem |
| Performance (CWV) | 10% | 90 | Likely* | Mobile ~94–96; desktop recuperado pós-fix do Maps |
| Otimização de imagens | 10% | 90 | Confirmado | next/image AVIF/WebP, hero self-hosted, alt ok |
| AI Search / GEO | 5% | 95 | Confirmado | llms.txt + llms-full.txt, política de bots exemplar |

> *PageSpeed API retornou rate-limit (sem chave / sem API paga). Os CWV vêm das medições manuais e por Playwright desta semana, não de uma corrida fresca no momento da auditoria — confiança `Likely`.

**Resumo executivo:** O site está em **excelente estado e mais sólido do que a auditoria anterior capturou**. Além de a regressão de Open Graph já estar corrigida e **confirmada em produção**, dois problemas reais que as auditorias formais anteriores **não haviam detectado** foram encontrados e corrigidos nesta semana: **HTTP 500 em ~11 páginas de informação** e o **TBT de desktop estourado pelo embed do Google Maps**. Ambos verificados como resolvidos ao vivo. Não há nenhum achado crítico em aberto.

---

## Evolução desde a última auditoria

| Item | Antes | Agora | Evidência (live) |
|------|-------|-------|------------------|
| Open Graph site-wide (image/type/site_name/locale/twitter:image) | 🔴 removido | ✅ presente | curl: OG 7/7 em todas as páginas |
| Páginas de informação (HTTP) | 🔴 ~11 em **500** | ✅ **200** | curl em produção |
| Desempenho desktop / TBT | 🔴 72 (Maps) | ✅ recuperado | Playwright: 0 requests do Maps no load inicial |
| Acessibilidade (touch targets) | ⚠️ 96 | ✅ 100 | PageSpeed (medido na semana) |
| LCP mobile do hero | ⚠️ 3,2 s | ✅ ~2,7 s | PageSpeed (medido na semana) |
| `og:type=article` em artigos | ❌ | ✅ | curl `/informations/*` |

---

## 1. Technical SEO — 96/100 ✅

| Item | Status | Evidência (live) |
|------|:------:|------------------|
| HTTPS | ✅ | HTTPS Yes |
| Canonical auto-referenciado | ✅ | `<link rel="canonical" href="https://n8xmarketing.com.br">` |
| hreflang pt/en | ✅ | `hreflang="pt"` + `hreflang="en"` |
| robots.txt | ✅ | 200, aponta sitemap, bloqueia `/admin` por locale |
| Bots de IA de citação | ✅ liberados | GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended |
| Scrapers de IA de treino | ✅ bloqueados | Bytespider, CCBot, Amazonbot, anthropic-ai, Applebot-Extended, FacebookBot → `Disallow: /` |
| sitemap.xml | ✅ | 177 URLs |
| Sem erros de servidor | ✅ **novo** | páginas `/informations/*` voltaram a 200 (eram 500) |
| Cabeçalhos de segurança | ✅ 85/100 | HSTS preload, X-Frame DENY, nosniff, Referrer-Policy, Permissions-Policy |
| CSP | ⚠️ ausente (consciente) | `docs/adr/0004-defer-csp.md` |

## 2. Conteúdo & E-E-A-T — 90/100 ✅
Autor-pessoa (Thiago) nos artigos, datas reais (`createdAt`/`updatedAt`), `parentOrganization` com `url`+`sameAs`, 177 URLs, catálogo pt/en completo. Maior alavanca restante = **cadência editorial**.

## 3. On-Page SEO — 93/100 ✅
Title único + template, meta description, 1 H1 por página, canonical+hreflang. **Open Graph completo restaurado** (regressão da auditoria anterior corrigida no PR #67, fonte única `baseOpenGraph`): OG 7/7; Twitter 4/6 (faltam só os opcionais `twitter:site`/`creator`).

## 4. Schema / Dados Estruturados — 95/100 ✅
4 blocos JSON-LD na home; grafo `@id` interligado (ProfessionalService, WebSite, BreadcrumbList, Service, Article, CreativeWork). Article com `image`+`datePublished`+`dateModified`+autor `Person`. Apenas JSON-LD; nada depreciado/restrito.

## 5. Performance / Core Web Vitals — 90/100 ✅ (Likely)
> PageSpeed API rate-limited (sem chave). Números das medições da semana:
- **Mobile:** Desempenho ~94–96; LCP ~2,7 s (zona "a melhorar", limítrofe), TBT ~0–10 ms, CLS 0,004.
- **Desktop:** LCP ~0,9 s; TBT recuperado após o lazy-load do Maps (#65) — verificado ao vivo: 0 requests do Maps no carregamento inicial.

## 6. Otimização de Imagens — 90/100 ✅
`next/image` (AVIF/WebP, responsivo, lazy), hero self-hosted, disciplina de `alt`, `remotePatterns` restrito. Imagem OG referenciada novamente em todas as páginas.

## 7. AI Search / GEO — 95/100 ✅
`llms.txt` (200) + `llms-full.txt` (200), bots de citação liberados, scrapers de treino bloqueados, entidade resolvível via grafo `@id` + organização-mãe.

---

## Tabela de Achados (priorizada)

| # | Severidade | Achado | Confiança |
|---|:----------:|--------|:---------:|
| 1 | ⚠️ Warning | CSP ausente (dívida consciente — ADR-0004) | Confirmado |
| 2 | ℹ️ Info | LCP mobile ~2,7 s (limítrofe; >2,5 s) — otimização incremental | Likely |
| 3 | ℹ️ Info | `twitter:site`/`twitter:creator` ausentes (opcionais) | Confirmado |
| 4 | ℹ️ Info | CWV não medidos em corrida fresca (API rate-limit) | Limitação de ambiente |
| 5 | ℹ️ Info | Cadência editorial = maior alavanca orgânica restante | Estratégico |

## Limitações da Auditoria
- **PageSpeed Insights:** rate limit da API (sem chave / sem API paga). CWV das medições manuais/Playwright da semana — confiança `Likely`. Número fresco: rodar em https://pagespeed.web.dev.
- Demais achados confirmados no HTML ao vivo **e** no código-fonte.
