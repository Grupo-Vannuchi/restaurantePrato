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

## Reauditoria — 18/09/2026, com o conteúdo real no ar

**Escopo:** site publicado (`full-site`, 9 rotas), com evidência da skill `seo`
(Agentic-SEO-Skill) e verificação direta no HTML servido. A auditoria acima é de
17/09 e mediu um site com o **cardápio antigo (82 pratos) e a galeria quebrada**;
esta roda depois da carga de conteúdo em produção — 98 pratos, 22 fotos, `Menu`
em JSON-LD e AVIF ligado.

**Nota:** sem nota numérica, pela mesma razão da auditoria original — `noindex`
deliberado domina qualquer rubrica. *Score confidence: Low* enquanto o domínio
não chegar.

### O que a rubrica confirma, com evidência nova

| Área | Evidência | Estado |
|---|---|---|
| **AVIF** | mesma foto, `w=640&q=50`: **6.657 B** em AVIF contra **14.938 B** em WebP — 2,24× | ✅ a decisão de hoje se paga no ar |
| **Cabeçalhos** | `security_headers.py`: **100/100**, HSTS com `preload`, CSP, `DENY`, `nosniff` | ✅ |
| **Dado estruturado** | `Restaurant` + `WebSite` + **`Menu`**; 121 itens; `geo`, `priceRange`, `paymentAccepted`; zero `review`/`aggregateRating` | ✅ |
| **Canonical e hreflang** | auto-referente em todas as rotas, `hreflang=pt` | ✅ |
| **Links** | `/galeria`: 11 links, **0 quebrados**; redirecionamento: **0 saltos**, 136 ms | ✅ |
| **Social** | OG completo; Twitter `summary_large_image` com título, descrição e imagem | ✅ |
| **Imagens da galeria** | 22 fotos, todas com `<figcaption>`; `alt=""` é o padrão correto de `figure`+`figcaption` | ✅ |

⚠️ **Dois falsos positivos que eu mesmo levantei e derrubei na verificação**, e
ficam escritos para não voltarem como achado:

- *"20 links sem texto âncora"* (`internal_links.py`): o script lê só conteúdo
  textual. Na home são 5, e **todos têm nome acessível** — `aria-label` no link
  ou `alt` na imagem. Não é defeito;
- *"24 imagens sem `alt` em `/galeria`"*: `alt=""` ali é deliberado e correto —
  a `<figcaption>` logo abaixo carrega a descrição, e um `alt` repetido faria o
  leitor de tela anunciar a mesma frase duas vezes. Está documentado em
  `gallery-photo-card.tsx`. O mesmo vale para as três fotos do hero, que são
  fundo sob um véu, com o título do slide por cima.

### Os cinco "🔴 críticos" que são decisão, não defeito

Todos presos à mesma trava, e todos somem sozinhos quando o domínio chegar:
`robots.txt` com `Disallow: /`; sem diretiva `Sitemap:`; **`/sitemap.xml`
respondendo com zero URLs** (`if (!env.SITE_INDEXABLE) return []`, com o motivo
no código: rastreador busca esse caminho por convenção); `/llms.txt` em 404; e
`<meta name="robots">` com `noindex, nofollow` em toda rota.

### Achados reais

| # | Área | Severidade | Confiança | Achado | Evidência | Correção |
|---|---|---|---|---|---|---|
| R1 | On-page | ⚠️ Warning | Confirmado | Meta description das páginas legais era o parágrafo jurídico inteiro | 370 caracteres em `/privacy`, 350 em `/terms`, contra o corte de ~160 | ✅ **fechado em 18/09** — copy própria no catálogo, 130 e 129 caracteres |
| R2 | On-page | ⚠️ Warning | Confirmado | `/terms` publicava o marcador interno na meta tag | `content="…utilização do site «PENDENTE: domínio final do site»…"` no HTML servido | ✅ **fechado em 18/09** — junto de R1. No CORPO o marcador fica, de propósito |
| R3 | Conteúdo | ⚠️ Warning | Confirmado | `/novidades` tem 89 palavras: existe, está linkada e entra no sitemap, sem nenhum artigo | contagem no HTML servido; `h1` "Novidades" e nada abaixo | **decisão sua** — publicar conteúdo ou tirá-la do sitemap enquanto vazia |
| R4 | Imagens | ℹ️ Info | Confirmado | As três fotos do hero não dão sinal textual para busca de imagens | `alt=""` correto para fundo decorativo; não há `figcaption` | oportunidade, não defeito — mexer conflita com o padrão decorativo |
| R5 | Social | ℹ️ Info | Confirmado | `twitter:site` e `twitter:creator` ausentes | `social_meta.py` | opcionais; dependem de conta no X, que o cliente não tem |

### Páginas finas, medidas

`/novidades` 89 · `/contato` 155 · `/reservas` 187 · `/galeria` 214 ·
`/experiencia` 384 · `/` 423 · `/cardapio` **972** · `/terms` 1.146 ·
`/privacy` 1.299 palavras.

Só `/novidades` é fina por **ausência de conteúdo** (R3). As outras são curtas
pela natureza da página — um restaurante de bairro não tem 800 palavras a dizer
sobre o próprio horário, e encher a página para bater uma meta de contagem é
exatamente o que a rubrica chama de conteúdo sem valor. `/cardapio` quase dobrou
com a carga de hoje: era o retrato de 82 pratos.

### Limitação de ambiente

**Core Web Vitals de campo não foram medidos**: a API do PageSpeed devolveu
*rate limit* em duas tentativas. Pela regra da skill isso é limitação de
ambiente, não defeito do site, e mantém *Hypothesis* para a categoria de
performance. O que existe de laboratório é do próprio projeto:
`e2e/performance.spec.ts`, com orçamento de LCP declarado por rota, passou nesta
data — e o ganho de peso do AVIF está medido acima, no otimizador de produção.

---

## Estado dos achados — atualizado em 18/09/2026

A auditoria é de 17/09. O que mudou desde então, com o commit que fechou cada item:

| # | Achado | Estado |
|---|---|---|
| 1 | `Restaurant` sem `image` | ✅ fechado — `09c8d35`, apontando para `/opengraph-image.jpg` |
| 2 | `priceRange` ausente | ✅ fechado — `09c8d35`, **derivado** de `precoDaMassa()`/`precoDoBuffet()`, nunca digitado |
| 3 | `geo` e `paymentAccepted` ausentes | ✅ fechado — `aa10b82`, com as coordenadas e as formas de pagamento que o cliente mandou |
| 4 | `menu` em vez de `hasMenu` | ✅ fechado — `09c8d35`, as duas propriedades saem apontando para o mesmo lugar |
| 5 | `/cardapio` sem dado estruturado de cardápio | ✅ fechado — 18/09, opção **(a)** escolhida pelo dono: a união, **sem eixo de dia**. 13 seções, 125 itens, 27 ofertas no HTML publicado |
| 6 | `og:title` com 66 caracteres | ✅ fechado — 18/09: chave própria `metadata.ogTitle`, 56 caracteres. O `<title>` fica nos 66 de propósito |

E um item que estava fora da lista de marcação, sob "Não verificado":

| O quê | Estado |
|---|---|
| Peso de imagem (AVIF desligado por dois motivos errados) | ✅ fechado — `782ac7f`. `/galeria` cai de 16.723 KB para 8.215 KB; `/` de 4.459 para 2.429. A condição de reabertura escrita no `next.config.ts` foi cumprida: 40 requisições, 0 penduradas |

**Guardas que passaram a cobrar isso**, todas medindo o HTML publicado e não o objeto do
código: `e2e/structured-data.spec.ts` (os campos novos do `Restaurant`, incluindo uma faixa
estreita de latitude/longitude para Santos), `e2e/metadata-routes.spec.ts` (o `og:title`
publicado, e que ele NÃO é igual ao `<title>`) e `test/metadados-cabem-no-cartao.test.ts`
(o teto de um e o **piso** do outro — só o teto faria o conserto óbvio, encurtar os dois,
passar).

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

## Nota — 18/09/2026

⚠️ **A versão anterior desta seção dizia "não atribuo nota numérica".** A recusa tinha um
motivo certo — `Disallow: /` e `noindex` deliberados colapsam qualquer rubrica por algo que
não é defeito, e uma nota baixa manda alguém "consertar" o que o build existe para proteger.
Mas recusar o número deixa a pergunta sem resposta, e ela é legítima. A saída é dar **duas**
notas e dizer o que cada uma mede.

Pesos da rubrica da skill: Técnico 25% · Conteúdo 20% · On-page 15% · Dado estruturado 15% ·
Performance 10% · Imagens 10% · GEO 5%.

| Categoria | Nota | O que segura | O que sobe |
|---|---:|---|---|
| **Técnico** | 95 | HTTPS, 100/100 de cabeçalhos, canonical auto-referente, `hreflang`, 0 saltos de redirecionamento, 0 links quebrados | — (a trava de lançamento sai da conta aqui; ver abaixo) |
| **Conteúdo** | 80 | negócio real, endereço, CNPJ, horário, fotos autorais, 98 pratos, depoimentos com fonte verificável | `/novidades` com 89 palavras; sem autoria declarada (E-E-A-T) |
| **On-page** | 90 | títulos únicos e no tamanho, uma `h1` por página, árvore de títulos com guarda, descrições ≤ 160 desde hoje | descrições curtas em páginas curtas |
| **Dado estruturado** | 95 | `Restaurant` completo + `WebSite` + `Menu` com 121 itens; zero avaliação, como manda a regra | `sameAs` com um item só (falta Facebook); sem `telephone` — deliberado |
| **Performance** | 85 | AVIF 2,24× menor no ar; orçamento de LCP por rota passando | **campo não medido** — *Score confidence: Low* |
| **Imagens** | 90 | AVIF+WebP, `qualities` declarada, `sizes`, prioridade só na primeira, legendas | hero sem sinal textual para busca de imagens |
| **GEO** | 85 | dado estruturado forte, que é o que a citação por IA lê | `llms.txt` fechado — deliberado |

### As duas notas

**89/100 — "Good", a um ponto de "Excellent".** É o que o site vale **no que ele controla**,
com a trava de lançamento fora da conta. É esta a nota que diz se o trabalho está bem feito.

**70/100 — "Needs Improvement".** É o que uma ferramenta de rastreio devolve **hoje**, porque
ela conta `Disallow: /`, `noindex` e o sitemap vazio como falha técnica e como GEO zerada.
Os dois números descrevem o mesmo site; a diferença inteira é a trava.

⚠️ **Não compare com o "94/100" de `docs/seo/AUDIT-REPORT.md`** — aquilo é
`n8xmarketing.com.br`, o site da agência, medido em 26/06 com outra rubrica e outro conteúdo.
Comparar os dois números é comparar dois sites.

### O que falta para os 89 virarem 100

Nada disso é marcação, e três dependem do cliente:

1. **domínio final** — libera a trava e faz a nota de rastreio encontrar a de mérito;
2. **`/novidades` com conteúdo** (ou fora do sitemap enquanto vazia) — vale ~4 pontos de
   Conteúdo;
3. **Core Web Vitals de campo** — só existem com tráfego real, ou seja, depois de abrir;
4. **Facebook** confirmado, para o `sameAs` sair com mais de um item;
5. **autoria declarada** nas novidades, quando houver novidade — é o sinal de E-E-A-T que
   falta.
