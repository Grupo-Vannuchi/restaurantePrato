# Plano de ação SEO — Restaurante Prato

**Site:** https://restaurante-prato.vercel.app
**Data:** 17/09/2026
**Auditoria:** [AUDITORIA-PRATO.md](AUDITORIA-PRATO.md)

> Leia a ressalva da auditoria antes deste plano: o site está fechado aos buscadores de
> propósito, e dois "🔴 críticos" que a ferramenta aponta são decisões deliberadas. Nada
> neste plano pede para abrir o site.

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

O último deploy é o merge `8e60f89`. Depois dele entraram em `Development`, e **não estão no
ar**: os preços do cardápio (`ff1312c`), a guarda do link de avaliação (`5253566`), a segunda
semana do cardápio (`fb510e8`) e as duas correções de guarda (`a932c16`).

E há dois itens que **não** se resolvem com deploy:

- a **galeria** referencia 6 fotos em produção, duas delas apontando para arquivo que o
  deploy de hoje removeu — **dois quadros quebrados no ar agora**. Conserto:
  `node scripts/importa-galeria.mjs` contra o banco de produção, com `DATABASE_URL`
  explícito;
- o **cardápio do buffet** vive no banco, e a segunda semana foi carregada só no banco
  **local**. Produção segue com os 82 pratos antigos até o script rodar contra ela.

Medir SEO de conteúdo antes disso é medir um site que não é o atual.
