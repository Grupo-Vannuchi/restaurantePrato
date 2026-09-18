# Plano de ação SEO — Restaurante Prato

**Site:** https://restaurante-prato.vercel.app
**Data:** 17/09/2026
**Auditoria:** [AUDITORIA-PRATO.md](AUDITORIA-PRATO.md)

> Leia a ressalva da auditoria antes deste plano: o site está fechado aos buscadores de
> propósito, e dois "🔴 críticos" que a ferramenta aponta são decisões deliberadas. Nada
> neste plano pede para abrir o site.

## Reauditoria de 18/09 — o que ela acrescentou

Rodada depois da carga de conteúdo em produção, com a skill `seo`. Dois achados
novos, os dois já fechados, e um que depende de você:

| Item | Estado |
|---|---|
| R1 · meta description das páginas legais com 370/350 caracteres | ✅ 18/09 — copy própria, 130 e 129 |
| R2 · `/terms` publicava `«PENDENTE: domínio final do site»` na meta tag | ✅ 18/09 — o marcador fica no CORPO, que é onde ele trabalha |
| R3 · `/novidades` com 89 palavras e nenhum artigo | ⏸️ **decisão sua** |
| R4 · fotos do hero sem sinal para busca de imagens | ℹ️ oportunidade, não defeito |
| R5 · `twitter:site`/`creator` ausentes | ℹ️ dependem de conta no X, que o cliente não tem |

### R3 — a decisão

`/novidades` está publicada, linkada no cabeçalho e no rodapé, e entra no
sitemap quando o site abrir — com 89 palavras e nenhum artigo. Para o buscador
isso é uma página fina; ela some do índice ou pesa contra a avaliação do site.

Três caminhos:

- **a)** o cliente publica duas ou três novidades reais (prato do mês, feriado,
  mudança de horário) — resolve de vez e dá conteúdo fresco, que é sinal;
- **b)** a rota sai do sitemap **enquanto não houver artigo publicado**, e volta
  sozinha no primeiro. É uma linha em `src/app/sitemap.ts`, com guarda;
- **c)** não fazer nada até o domínio chegar, já que o site está fechado.

**Recomendo (b) agora e (a) quando o cliente tiver o que dizer**: (b) é
automático e não depende de ninguém, e não impede (a).

⚠️ Note que (b) **não** tira a página do site nem do menu — ela continua
acessível a quem clicar. Só deixa de ser oferecida ao rastreador enquanto está
vazia.

---

## Estado em 18/09/2026

| Item | Estado |
|---|---|
| 1 · `image` no `Restaurant` | ✅ `09c8d35` |
| 2 · `priceRange` derivado | ✅ `09c8d35` |
| 3 · `hasMenu` ao lado de `menu` | ✅ `09c8d35` |
| 4 · `og:title` abaixo de 60 | ✅ 18/09 — 56 caracteres, chave própria `metadata.ogTitle`. O `<title>` fica nos 66 |
| 5 · dado estruturado do cardápio | ✅ 18/09 — **(a)**, a união sem eixo de dia. `Menu` com `@id` próprio em `/cardapio`; preço só onde a casa cobra por item |
| 6 · AVIF de volta | ✅ `782ac7f` — `/galeria` de 16.723 KB para 8.215 KB |
| 🥉 `geo` e `paymentAccepted` | ✅ `aa10b82` — saiu do balde "depende do cliente" quando ele mandou as coordenadas e as formas de pagamento |

**Todos os itens deste plano estão fechados**, cada um com guarda medindo o HTML publicado. O 5 era o único que dependia de decisão, e a decisão foi tomada em 18/09: opção (a).

O que resta de SEO não está em marcação — está no domínio final e no deploy.

⚠️ **E a produção segue atrasada em relação ao `Development`** — ver a última seção. Nada
do que está fechado acima está no ar até o deploy.

---

---

## 🥇 Faço agora, sem depender de ninguém

Três itens, todos em `src/components/json-ld.tsx`, todos derivados de dado que já existe no
código — nenhum digitado.

1. **`image` no `Restaurant`** — apontar para `/opengraph-image.jpg`, que já está no ar.
   Sem isso o resultado rico de restaurante sai sem foto.
2. **`priceRange` derivado de `menuPricing`** — deixou de ser palpite hoje: buffet
   R$ 94,99/kg e porção de massa R$ 41,90. Mantendo o contrato do projeto: **sem preço
   configurado, o campo não sai**, no mesmo padrão de `precoDoBuffet()`.
3. **`hasMenu` ao lado de `menu`** — a propriedade corrente do schema.org. Risco zero.

E um quarto, fora do JSON-LD:

4. **`og:title` abaixo de 60 caracteres** em `lib/seo.ts`, mantendo o `<title>` como está —
   são campos diferentes, com públicos diferentes.

**Guarda obrigatória:** `e2e/structured-data.spec.ts` já parseia o que as páginas publicam
e recusa `review`/`aggregateRating` em qualquer profundidade. Os campos novos entram na
mesma guarda, cobrando o valor no HTML publicado — não no objeto do código. É a lição de
`test/os-fatos-do-llms-txt.test.ts`, que prova a função e não a rota: **a guarda tem de
buscar a URL que a página publica.**

---

## 🥈 Depende de uma decisão sua

5. **Dado estruturado do cardápio** (`Menu` / `hasMenuSection` / `MenuItem`) — é o maior
   ganho de SEO disponível, porque o cardápio é o conteúdo real do site: 98 pratos, 7
   categorias, cinco dias úteis.

   ⚠️ **A decisão:** o banco tem a **união das duas semanas**, então um `Menu` gerado dali
   afirma que numa segunda saem ~37 pratos. Em tela isso é aceitável (a pessoa vê a lista
   do dia); em dado estruturado é mais assertivo. Três caminhos:

   - **a)** emitir a união, com `Menu` sem eixo de dia — descreve "o que a casa serve", não
     "o que sai hoje". Honesto e simples;
   - **b)** emitir `hasMenuSection` por dia da semana, que replica a afirmação da união;
   - **c)** esperar a âncora de semana e emitir o dia certo.

   **Recomendo (a)**: descreve o cardápio sem afirmar o dia, e não depende de dado que não
   temos.

6. **AVIF de volta, com as marcas fora do otimizador** — não é SEO de marcação, é Core Web
   Vitals, e é o maior ganho de performance disponível: a produção serve as fotos **~2x mais
   pesadas** do que precisa. Está fora deste plano porque tem verificação própria (a condição
   de reabertura escrita no `next.config.ts`), mas pesa no LCP de celular, que é o que o
   Google mede.

---

## 🥉 Depende do cliente

7. **`geo`** — as coordenadas já estão em mão (`-23.933115, -46.328043`), mas **o número do
   endereço está em aberto**: o cliente mandou 9; a Receita Federal e a fotografia da
   fachada dizem 25, e é 25 que está publicado. Coordenada discordando do endereço é pior
   que coordenada ausente.
8. **`paymentAccepted`** — VR, VA, cartão, Pix e dinheiro já foram passados. Entra junto com
   a copy visível de formas de pagamento, que ainda não foi escrita.
9. **`sameAs` com o Facebook** — a página `facebook.com/restauranteprato1` foi encontrada e
   é plausível, mas a prova de que é desta casa **não sobreviveu à verificação**. Precisa da
   sua palavra antes de entrar no grafo.
10. **`telephone`** — segue **fora**, e corretamente: dois números aparecem em fontes
    terceiras e nenhum tem fonte viva (um é campo cadastral de 1998, o outro rastreia até um
    site que morreu em 2019).

---

## ⛔ O que NÃO fazer

- **Não abrir o site aos buscadores.** Enquanto `src/content/legal.ts` tiver `«PENDENTE»`,
  `SITE_INDEXABLE=true` derruba o build, e isso é proteção, não obstáculo. A ferramenta de
  SEO vai insistir que é crítico; não é.
- **Não criar `/llms.txt` estático.** A rota existe e se cala de propósito enquanto o site
  está fechado. Um arquivo em `public/` iria contradizer o `robots.txt` e envelhecer, porque
  o conteúdo é gerado de `siteConfig`, de `config/menu.ts` e do banco.
- **Não adicionar `FAQPage`.** Restrito a sites de governo e saúde desde agosto de 2023.
- **Não adicionar `HowTo`.** Resultado rico removido em setembro de 2023.
- **Não wirear depoimentos no dado estruturado.** Regra permanente do projeto, com duas
  guardas: `test/json-ld-sem-avaliacao.test.ts` e `e2e/structured-data.spec.ts`.
- **Não mexer no `'unsafe-inline'` da CSP** por conta de SEO. A decisão está no ADR-0004,
  com as três condições que a reabrem.

---

## Antes de qualquer coisa: a produção está atrasada

⚠️ **Atualizado em 18/09/2026.** A versão anterior desta seção dizia que o último deploy era
`8e60f89` e listava quatro commits fora do ar — os preços, a guarda do link de avaliação, a
segunda semana do cardápio e as correções de guarda. **Todos esses já subiram**: a `main`
está em `f496349`. Deixo a correção visível em vez de reescrever calado, porque uma lista de
"o que falta subir" é exatamente o tipo de frase que envelhece sem avisar e manda alguém
fazer deploy do que já está no ar.

O último deploy é o merge **`f496349`**. Depois dele entraram em `Development` e **não estão
no ar**: o fundo e a serifa do cardápio (`73b8202`, `675aa4b`), a paridade de dado
estruturado com `geo` e `paymentAccepted` (`aa10b82`), o AVIF de volta (`782ac7f`), os bytes
invisíveis (`f74a611`) e o portão de banco do E2E (`bae5e7b`).

A conta que não envelhece: `git log --oneline origin/main..origin/Development`.

E há dois itens que **não** se resolvem com deploy:

- a **galeria** referencia 6 fotos em produção, duas delas apontando para arquivo que o
  deploy de hoje removeu — **dois quadros quebrados no ar agora**. Conserto:
  `node scripts/importa-galeria.mjs` contra o banco de produção, com `DATABASE_URL`
  explícito;
- o **cardápio do buffet** vive no banco, e a segunda semana foi carregada só no banco
  **local**. Produção segue com os 82 pratos antigos até o script rodar contra ela.

Medir SEO de conteúdo antes disso é medir um site que não é o atual.
