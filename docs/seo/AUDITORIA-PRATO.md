# Auditoria de SEO — Restaurante Prato

**Site:** https://restaurante-prato.vercel.app
**Código-fonte:** Next.js 16 · App Router · next-intl (PT-only)
**Data:** 17/09/2026
**Método:** skill `seo` (Agentic-SEO-Skill) — LLM-first + scripts da skill + verificação direta em produção e cruzamento com o código-fonte
**Auditoria anterior deste site:** nenhuma

> ⚠️ **`docs/seo/AUDIT-REPORT.md` e `docs/seo/ACTION-PLAN.md` NÃO são deste site.**
> Eles auditam `n8xmarketing.com.br`, o site da agência de onde este repositório foi
> forkado duas vezes, e estão datados de 26/06/2026 com nota "94/100". `docs/` não é
> varrido por `test/brand-hygiene.test.ts` de propósito — os specs do rebrand explicam
> por que o código tem a forma que tem —, mas uma auditoria de outro domínio não explica
> nada aqui. Quem abrir aquela pasta hoje conclui que o Prato está auditado. Por isso
> esta auditoria usa nome próprio em vez de sobrescrever o registro histórico da agência.

---

## A ressalva que rege a leitura inteira

**Este site está fechado aos buscadores de propósito**, e isso domina qualquer pontuação
automática de SEO. Duas descobertas da skill que são **falso positivo neste projeto**:

| Achado da skill | Realidade |
|---|---|
| 🔴 `robots.txt` com `Disallow: /` para todos os agentes, sem `Sitemap:` | Deliberado. `SITE_INDEXABLE=false` enquanto `src/content/legal.ts` tem `«PENDENTE»` no domínio final. Desde 20/08 `SITE_INDEXABLE=true` com qualquer pendência **derruba o build** — não há como abrir por engano |
| 🔴 `/llms.txt` não encontrado (404) | Deliberado, e o código diz por quê: `if (!env.SITE_INDEXABLE) return new Response("Not Found", { status: 404 })`. Servir o mapa do site enquanto o `robots.txt` pede para não rastrear seria contradição. A rota existe, tem guarda de conteúdo em `test/os-fatos-do-llms-txt.test.ts`, e volta sozinha quando o site abrir |

Eu quase reportei os dois como defeito. Verificado: `/zzteste.txt`, uma rota descartável com
ponto no nome, responde **200** — então não é o proxy nem o ponto; é o portão de
`SITE_INDEXABLE`, com docblock explicando.

**Consequência prática:** nota numérica de SEO aqui não significa nada até o domínio
chegar. O que vale é a lista de itens que já podem ser resolvidos, para o site nascer
correto no dia em que abrir.

---

## O que está correto, verificado em produção

| Categoria | Evidência |
|---|---|
| **Cabeçalhos de segurança** | **100/100** pelo `security_headers.py`. HSTS com `preload`, CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| **Open Graph** | Completo: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`, `og:locale`. O `og:image` **resolve** — corrigido no deploy de hoje, depois de dois dias em 404 |
| **Twitter Card** | `summary_large_image` com título, descrição e imagem. `twitter:site`/`creator` ausentes, ambos opcionais |
| **Avaliação fora do dado estruturado** | `aggregateRating` e `review` **ausentes** em toda profundidade, nas duas rotas conferidas. É a regra permanente do projeto, e ela está cumprida |
| **Gestão de rastreador de IA** | GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended, Bytespider, CCBot e mais quatro, todos bloqueados pelo curinga — coerente com o estado fechado |
| **`sitemap.xml` e `robots.txt`** | Respondem 200 |
| **Referência `@id`** | `Restaurant` é `#organization` e o `WebSite.publisher` aponta para ele. Sem referência pendurada |

---

## Achados

### 1. `Restaurant` sem `image` — ⚠️ Warning

**Evidência:** o bloco `Restaurant` de `/` e `/cardapio` não tem `image`. O `og:image`
existe e resolve, mas são campos diferentes e o Google usa `image` do dado estruturado
para o resultado rico de restaurante.

**Impacto:** resultado rico sem foto. Para restaurante, a foto é metade do clique.

**Conserto:** apontar `image` para `/opengraph-image.jpg`, que já existe, ou para uma foto
do buffet. Uma linha em `components/json-ld.tsx`.

### 2. `priceRange` ausente — ⚠️ Warning, e agora é resolvível

**Evidência:** ausente no `Restaurant`. Até hoje era **corretamente** ausente: o projeto
não inventa dado de cliente, e o preço não existia.

**Mudou hoje:** o cliente passou buffet a **R$ 94,99/kg** e porção de massa a **R$ 41,90**
(commit `ff1312c`). O campo deixa de ser palpite.

**Conserto:** derivar de `menuPricing`, nunca digitar. E manter o contrato do projeto: sem
preço configurado, o campo não sai — em vez de sair vago.

### 3. `geo` e `paymentAccepted` ausentes — ⚠️ Warning, com uma dependência

**Evidência:** ausentes no `Restaurant`. São padrão para negócio local e alimentam busca
por proximidade.

**Dados já em mão:** coordenadas `-23.933115, -46.328043` (corroboradas a ~30 m por fonte
independente) e formas de pagamento VR, VA, cartão, Pix e dinheiro.

**⚠️ Dependência:** o `geo` vai junto com o endereço, e **o número está em aberto** — o
cliente mandou 9; o registro da Receita Federal e a fotografia da fachada dizem **25**, e é
25 que a produção publica. Não escrevo coordenadas enquanto isso não fechar, porque
coordenada e endereço discordando é pior que coordenada ausente.

### 4. `menu` em vez de `hasMenu` — ℹ️ Info

**Evidência:** o `Restaurant` usa `menu: ".../cardapio"`. A propriedade corrente do
schema.org é `hasMenu`; `menu` é a forma antiga, ainda aceita.

**Conserto:** emitir as duas, ou migrar para `hasMenu`. Risco zero, ganho pequeno.

### 5. `/cardapio` não descreve o cardápio em dado estruturado — ⚠️ Warning

**Evidência:** `/cardapio` emite os **mesmos** dois blocos da home (`Restaurant` +
`WebSite`). Não há `Menu`, `hasMenuSection` nem `MenuItem`.

**Impacto:** o cardápio é o principal conteúdo do site — 98 pratos em 7 categorias, cinco
dias úteis — e para o Google ele é hoje uma página qualquer.

**⚠️ E aqui há uma decisão a tomar antes de implementar:** o banco recebe a **união das
duas semanas** (ver `scripts/importa-cardapio.mjs`), então um `Menu` gerado dali afirmaria
que numa segunda saem ~37 pratos. Não é falso — é o que o site mostra —, mas é mais
afirmativo em dado estruturado que em tela. Se a âncora de semana chegar, isto melhora
junto.

### 6. `og:title` com 66 caracteres — ⚠️ Warning

**Evidência:** `social_meta.py`: "og:title is too long (66 chars, max 60)". O valor é
`Restaurante Prato | Almoço, buffet e churrasco no Centro de Santos`.

**Impacto:** corte no compartilhamento. Não afeta ranqueamento.

**Conserto:** um `og:title` mais curto que o `<title>`, o que é legítimo — são campos
diferentes com públicos diferentes.

---

## Não verificado

| O quê | Por quê |
|---|---|
| **Core Web Vitals de campo** | O PageSpeed Insights não tem dados de campo para um site fechado aos buscadores e sem tráfego. O que existe é medição de laboratório, e o projeto já tem a própria: `e2e/performance.spec.ts` guarda LCP com orçamento declarado, e passou hoje |
| **Perfil de backlinks** | Site fechado e sem domínio final. Medir agora não diz nada |
| **Peso real de imagem por página** | Está numa varredura paralela que ainda não fechou. Mas há um número já conhecido e admitido: a produção serve as fotos ~2x mais pesadas do que precisa, porque o AVIF foi desligado em 15/09 por **dois motivos errados** — a medição foi feita em q=75 (o site serve q=50, onde o AVIF é 2 a 2,8x menor) e o travamento do otimizador que motivou a remoção **não é do AVIF** (reproduzido hoje no caminho WebP). Isso é o maior ganho de performance disponível, e é decisão do dono |

---

## Nota

**Não atribuo nota numérica.** Com `Disallow: /` e `noindex` deliberados, qualquer peso da
rubrica colapsa a pontuação por um motivo que não é defeito — e uma nota baixa aqui mandaria
alguém "consertar" exatamente o que o build existe para proteger. A pontuação passa a fazer
sentido no primeiro deploy com domínio e `SITE_INDEXABLE=true`.

O que dá para afirmar: das seis categorias da rubrica, **segurança, Open Graph e a
disciplina de dado estruturado estão em ordem**; o que falta é campo de `Restaurant` e o
dado estruturado do cardápio.
