# Spec — White-label Fogão de Ouro → Restaurante Prato

**Data:** 2026-08-17
**Repositório:** `Victor227br/restaurantePrato`; `upstream` = `Grupo-Vannuchi/FogaoDeOuro` (fork confirmado).
**Branch de trabalho:** `Development` (a criar — hoje o `origin` só tem `main`).
**Documento de origem:** [`2026-08-07-whitelabel-fogao-de-ouro-design.md`](2026-08-07-whitelabel-fogao-de-ouro-design.md),
que descreve o rebrand anterior (n8x → Fogão de Ouro) e continua sendo a explicação
de *por que* o código tem a forma que tem.

---

## 1. Objetivo

Transformar o site do **Fogão de Ouro** no site do **Restaurante Prato** —
Coffee Shop na razão social, no Centro de Santos/SP — mas o negócio é um
restaurante de almoço, não uma cafeteria (corrigido em 19/08/2026).

Este é um white-label de **segunda geração**, e isso muda o tamanho do trabalho.
O rebrand anterior partiu do site de uma *agência*: teve de remover funis, cinco
models de agência, o bilíngue, e renomear todas as rotas. Nada disso se repete —
a estrutura de restaurante (cardápio, galeria, reservas por WhatsApp, schema
`Restaurant`, PT-only) já está pronta e é exatamente o que o cliente quer
reaproveitar. **Sobra apenas re-skin: identidade, dados legais, marca visual e
copy.**

O que este spec cobre é a parte que **não depende** de copy nem de identidade
visual — decisão do dono do projeto em 17/08/2026, para adiantar enquanto os
demais materiais não chegam.

---

## 2. Dados do cliente

### 2.1 Confirmados (recebidos em 17/08/2026)

| Campo | Valor | Onde vive |
|---|---|---|
| Nome fantasia | **Restaurante Prato** | `site.ts` → `name` |
| Razão social | PRATO COFFEE SHOP REFEICOES LTDA | `site.ts` → `legalName`; `legal.ts` |
| CNPJ | 03.354.096/0001-84 | `site.ts` → `registration`; `legal.ts` |
| Endereço | R. Augusto Severo, 25 — Centro, Santos/SP | `site.ts` → `contact.address`; `legal.ts` |
| CEP | 11010-050 | `site.ts` → `contact.address.postalCode`; `legal.ts` |
| Natureza | restaurante de almoço — buffet e churrasco; aceita reserva. **Não é cafeteria** *(corrigido em 19/08/2026)* | mantém `/reservas` e `acceptsReservations` |
| E-mail | pratocoffee@gmail.com | `site.ts` → `contact.email`; `legal.ts` (inclusive LGPD) |
| WhatsApp | +55 (13) 97820-8568 → `5513978208568` | `site.ts` → `contact.whatsapp` |
| Fundação | junho de 1998 → `foundedYear: 1998` | `site.ts` |

**CNPJ verificado.** Dígitos verificadores `84` conferem pelo algoritmo módulo 11
(DV¹ = 8, DV² = 4). Mesma checagem feita com o CNPJ do cliente anterior.

**Observação, não conflito:** o prefixo `03` do CNPJ sugere registro por volta de
1999–2000, enquanto a abertura informada é junho/1998. Isso é comum — a pessoa
jurídica pode ter sido constituída depois do início da operação, ou a operação
pode ter mudado de entidade. Fica registrado; `foundedYear` = **1998**, conforme
o cliente.

**Telefone fixo: não existe.** O número informado é exclusivamente WhatsApp
(confirmado pelo cliente). Ver §3.3.

### 2.2 Pendentes — nunca inventar

| Dado | Trava o quê | Chega quando |
|---|---|---|
| Horário de funcionamento | `/reservas`, `openingHoursSpecification`, `llms.txt`, imagem OG | junto com a copy — **resolvido em 19/08/2026**: segunda a sexta, das 11h às 15h, publicado em `site.ts` *(ver §4.1.1 e `docs/WHITELABEL-RESTAURANTE-PRATO.md`)* |
| Tipo de cozinha | `servesCuisine` | junto com a copy — **resolvido em 19/08/2026**: `["Brasileira", "Churrasco"]`, publicado *(ver §4.1.1 e `docs/WHITELABEL-RESTAURANTE-PRATO.md`)* |
| Copy institucional | ~40 strings em `pt.json` + 4 rotas de texto | o cliente vai enviar — **resolvido em 19/08/2026**: entregue e aplicada em todas as páginas públicas *(ver §4.1.1 e `docs/WHITELABEL-RESTAURANTE-PRATO.md`)* |
| Paleta de cores | `theme.light` / `theme.dark` | o cliente vai enviar |
| Logo | `public/brand/`, `logo.tsx`, `icon`, `apple-icon`, `opengraph-image` | o cliente vai enviar |
| Fotos (hero, galeria, cardápio) | `hero.tsx` (`slideImages` está vazio), admin | o cliente vai enviar |
| Instagram / Facebook | `social` → `sameAs` do JSON-LD | a confirmar — **Instagram resolvido em 19/08/2026** (`https://instagram.com/restaurante.prato`, publicado); **Facebook continua pendente** *(ver §4.1.1 e `docs/WHITELABEL-RESTAURANTE-PRATO.md`)* |
| Domínio final | `NEXT_PUBLIC_SITE_URL`; fica `«PENDENTE»` no `legal.ts` | a confirmar |

### 2.3 Infraestrutura

Ainda **é para criar**: projeto novo no Supabase (com o bucket público `media`) e
projeto novo na Vercel, com `SESSION_SECRET` gerado do zero. Não reaproveitar
nada do Fogão de Ouro — dois sites gravando no mesmo banco misturariam cardápio,
galeria e leads dos dois restaurantes. O passo a passo vai para o `RUNBOOK.md`
adaptado; a execução é manual, fora do git.

---

## 3. Decisões de design

### 3.1 Sequência de PRs

Espelha o rebrand anterior: o que não depende de dado pendente entra primeiro.

| # | PR | Bloqueado por dado? |
|---|---|---|
| **1** | `refactor(brand)`: o repo deixa de ser o Fogão de Ouro | **Não** — é este spec |
| **2** | `feat(brand)`: paleta, logo, ícones, imagem OG | Sim — cores e logo |
| **3** | `feat(content)`: copy, horário, fotos, cardápio | Sim — copy e fotos |
| **infra** | Supabase + Vercel (fora do git) | Sim — domínio |

O PR 1 sai agora. É o que interrompe o problema mais urgente: `CLAUDE.md` importa
`docs/WHITELABEL-FOGAO-DE-OURO.md`, então **toda sessão de agente neste repo
começa sendo instruída de que este é o site do Fogão de Ouro**. Enquanto isso não
mudar, cada sessão futura parte do contexto errado.

### 3.2 A fronteira do "adiantar sem a copy"

O pedido foi adiantar o que não depende da copy. A fronteira precisa de uma
distinção explícita, porque a copy herdada não é neutra:

- **Escrever a copy do Prato** → espera o cliente. Fora do PR 1.
- **Remover afirmação falsa sobre o Prato** → é higiene, não redação. Entra no PR 1.

O `pt.json` e as rotas de texto afirmam hoje, sobre o restaurante deste site:
"salão de 180 lugares", "4,5 ★ em mais de 1.200 avaliações no Google", "churrasco
na brasa, peixes nobres e ilha de massas", "restaurante por quilo", "Rua Frei
Gaspar, 46", "a poucos passos da Bolsa do Café" e "segunda a sexta, das 11h às
15h". São fatos de **outro restaurante**. Mantê-los "só até a copy chegar" é
carregar propaganda enganosa esperando que ninguém publique por engano.

### 3.3 Campos que passam a ser opcionais

Três campos hoje obrigatórios não têm valor verdadeiro para o Prato. O projeto já
tem um idioma para isso — `whatsappLink()` devolve `null` e cada chamador degrada,
`legalName` é opcional e o JSON-LD omite o campo quando falta. Seguimos o mesmo
padrão em vez de inventar valor ou herdar o do cliente anterior.

**`contact.phone` → opcional.** Não há telefone fixo. Chamadores a ajustar:

| Local | Degradação |
|---|---|
| [`site.ts`](../../../src/config/site.ts) `phoneLink()` | passa a devolver `string \| null` |
| [`contato/page.tsx:46`](../../../src/app/[locale]/(marketing)/contato/page.tsx) | a linha "Telefone" some do bloco de contato |
| [`reservas/page.tsx:120`](../../../src/app/[locale]/(marketing)/reservas/page.tsx) | mostra só o horário, sem o número |
| [`footer.tsx:64`](../../../src/components/layout/footer.tsx) | omite a linha |
| [`reserve-button.tsx:37`](../../../src/components/reserve-button.tsx) | fallback `tel:` já é inalcançável (há WhatsApp), mas passa a ser type-safe |
| [`json-ld.tsx:59`](../../../src/components/json-ld.tsx) | `telephone` sai do `Restaurant` |

**`openingHours` → opcional.** Sem o horário real, o site omite em vez de exibir o
do Fogão de Ouro. Afeta `reservas/page.tsx`, `json-ld.tsx`
(`openingHoursSpecification` sai do grafo) e `llms.txt/route.ts`.

**`servesCuisine` → array vazio, e o JSON-LD passa a omitir quando vazio.** Hoje o
campo é emitido sempre; um array vazio no schema é ruído.

Os três voltam a ser preenchidos no PR 3 sem mudar tipo — opcional aceita valor.

### 3.4 Marca visual interina

`public/brand/` contém a logo do Fogão de Ouro, e quatro arquivos a consomem:
[`logo.tsx`](../../../src/components/layout/logo.tsx),
[`icon.tsx`](../../../src/app/icon.tsx),
[`apple-icon.tsx`](../../../src/app/apple-icon.tsx) e
[`opengraph-image.tsx`](../../../src/app/[locale]/opengraph-image.tsx). Trocar só o
`name` no `site.ts` deixaria o site do Prato exibindo o logotipo de outra empresa.

**Decisão: fallback tipográfico.** Os arquivos do cliente anterior saem e a marca
passa a ser desenhada com o `siteConfig.name` na Playfair Display, que o projeto já
carrega via `next/font` para os títulos — sem requisição externa e sem custo de
LCP. `icon`/`apple-icon` desenham a inicial sobre o grafite; a imagem OG compõe com
texto. O PR 2 volta a ser imagem quando a logo do Prato chegar.

Efeitos colaterais a tratar no mesmo PR:

- As regras `.brand-lockup-light` / `.brand-lockup-dark` em
  [`globals.css`](../../../src/app/globals.css) existem só para alternar os dois
  cortes do lockup do Fogão de Ouro. Saem com ele.
- O script `npm run brand:rasters` gera PNG a partir dos SVG do cliente anterior.
  Fica sem entrada — decidir no PR 2 se volta com a logo nova.
- [`opengraph-image.tsx:59`](../../../src/app/[locale]/opengraph-image.tsx) **chumba**
  `"Segunda a sexta · 11h às 15h"` no código em vez de ler `openingHours`.
  Aproveitar para corrigir: passa a ler a config e some quando o horário for
  desconhecido.

### 3.5 Copy interina — genérica e verdadeira

Cada string herdada é reduzida ao que é **comprovadamente verdade** sobre o Prato:
Centro de Santos, em operação desde 1998, R. Augusto Severo 25. O resto é
removido, não substituído por invenção.

O resultado é um site sem personalidade, e isso é intencional: ele fica coerente o
bastante para revisar layout e navegação, sem afirmar nada que precise ser
desmentido depois. A copy real entra no PR 3 string a string.

O critério, concretamente:

| Herdado | Vira | Por quê |
|---|---|---|
| "Picanha no ponto, direto da brasa." | "No Centro de Santos desde {foundedYear}." | o cardápio do Prato é desconhecido; a data e o bairro são verificáveis |
| "Restaurante por quilo no Centro de Santos" | "Restaurante no Centro de Santos" | modelo de serviço do Prato é desconhecido |
| "4,5 ★ em mais de 1.200 avaliações no Google" | *(removido)* | número de outro estabelecimento; não há substituto verdadeiro |
| "Salão de 180 lugares, amplo e climatizado" | *(removido)* | capacidade desconhecida |
| "Rua Frei Gaspar, 46 — a poucos passos da Bolsa do Café" | "R. Augusto Severo, 25 — Centro" | endereço real, confirmado |
| "Segunda a sexta, das 11h às 15h" | *(removido — o campo fica opcional, §3.3)* | horário desconhecido |

A regra: **substituir quando existe fato confirmado, remover quando não existe.**
Nunca aproximar.

Duas alavancas já existem no catálogo e devem ser usadas em vez de repetir o nome
literal: `{brand}` (alimentado por `siteConfig.name` em
[`layout.tsx:51`](../../../src/app/[locale]/layout.tsx)) e `{foundedYear}` /
`{years}` (via `fillYears`). Onde a copy herdada escreve a marca por extenso,
passa a usar o placeholder — assim o próximo cliente troca um campo, não quarenta
strings.

Superfícies a limpar além do `pt.json`:
[`llms.txt/route.ts`](../../../src/app/llms.txt/route.ts),
[`llms-full.txt/route.ts`](../../../src/app/llms-full.txt/route.ts),
[`manifest.ts`](../../../src/app/manifest.ts) e
[`validations/menu.ts`](../../../src/lib/validations/menu.ts) (comentário sobre
buffet por quilo).

**"Sem preços" não se herda.** A proibição de exibir preço era direção visual *do
Fogão de Ouro*, e o `MenuItem` foi construído em torno dela. É uma decisão de
produto do cliente anterior, não uma regra do código. Fica como pergunta aberta
para o Prato (§4.1) — não como regra assumida.

### 3.6 Documentação e memória do repositório

**Reescrever para o Prato:**

| Arquivo | O que tem de errado |
|---|---|
| `AGENTS.md` | descreve o Fogão de Ouro por inteiro |
| `CLAUDE.md` | importa `@docs/WHITELABEL-FOGAO-DE-OURO.md` |
| `README.md` | título, descrição e o badge de CI apontando para `Grupo-Vannuchi/FogaoDeOuro` |
| `SECURITY.md` | e-mail de contato do cliente anterior |
| `docs/RUNBOOK.md` | seção do fork cita o repositório de origem |
| `docs/seo/ACTION-PLAN.md` | mira "restaurante por quilo centro de Santos" e "perto da Bolsa do Café" — estratégia de palavra-chave do outro cliente |
| `public/brand/README.md` | descreve os cortes da logo do Fogão de Ouro |

`docs/WHITELABEL-FOGAO-DE-OURO.md` é substituído por um documento equivalente do
Prato, e o import no `CLAUDE.md` acompanha. O `public/brand/README.md` passa a
descrever o estado interino (marca tipográfica, sem arquivo) e volta a descrever
cortes quando a logo chegar, no PR 2.

**Sem mudança:** `docs/ARCHITECTURE.md`, `docs/TESTING.md` e `docs/adr/` são
brand-neutros — descrevem arquitetura e decisões técnicas que continuam valendo.
Conferido: nenhuma menção à marca nem ao modelo de negócio do cliente anterior.

**Remover — propriedade do cliente anterior, sem valor de engenharia aqui:**
`docs/Logos-fogao_de_Ouro/`, `docs/Copy site Institucional—Fogão de Ouro
Restaurante.pdf`, `docs/WHITELABEL-FOGAO-DE-OURO.pdf.md` e os SVG/PNG em
`public/brand/`.

**Manter — é a explicação do código:** `docs/superpowers/specs/` e
`docs/superpowers/plans/` do rebrand anterior. Eles registram por que as rotas têm
os nomes que têm, por que `Information`/`Testimonial` mantêm nome em inglês, por
que a paleta tem um hex por tema, por que os funis saíram. Apagar isso transforma
cada decisão em mistério na próxima sessão. Ganham um `README.md` na pasta
avisando que descrevem o **projeto de origem**, não este.

### 3.7 Higiene do fork

Dois itens que não vieram no clone e valem para qualquer sessão futura:

1. **Branch `Development`** — o `AGENTS.md` manda desenvolver nela; hoje o repo só
   tem `main`. Criar.
2. **Trava de push no `upstream`** — `git remote set-url --push upstream no_push`.
   É config *local*, não veio no clone, e sem ela um `git push upstream` acidental
   publicaria o site do Prato no repositório do Fogão de Ouro. Reaplicar e
   documentar.

O `pre-push` que roda `npm run typecheck` já vem via `core.hooksPath`, apontado
pelo `npm install`. Continua valendo.

---

## 4. Dívidas e riscos conhecidos

### 4.1 Perguntas abertas para o cliente

1. **Preços no cardápio.** O `MenuItem` foi desenhado sem preço por direção do
   cliente anterior — é decisão de produto do Fogão de Ouro, não regra deste
   código. O Prato quer exibir preço? A resposta muda schema, admin e
   `validations/menu.ts`. Não trava o PR 1.
2. **"Coffee shop" muda a estrutura?** A razão social diz *Coffee Shop Refeições*.
   As rotas herdadas (`/experiencia`, `/gastronomia`, `/reservas`, `/galeria`) foram
   desenhadas para um restaurante de almoço executivo. O dono do projeto confirmou
   reaproveitar a estrutura; se a copy revelar um posicionamento de cafeteria,
   renomear rota continua sendo **três edições acopladas** (`NavKey`, chaves `nav`
   no `pt.json`, pastas em `(marketing)/`). **Respondida em 19/08/2026: não
   revelou** — o Prato é restaurante de almoço, não cafeteria, e a estrutura
   fica como está. Ver §4.1.1.

### 4.1.1 Resolvidas em 17/08/2026

- **CEP:** 11010-050 (§2.1).
- **Reservas:** o Prato aceita reserva. `/reservas` e `acceptsReservations: true`
  permanecem como estão. (Esta entrada dizia "restaurante *e* cafeteria" — errado;
  ver a correção em 19/08/2026, abaixo.)

**Resolvidas em 19/08/2026** — ver
[`2026-08-19-copy-e-tom-de-voz-prato-design.md`](2026-08-19-copy-e-tom-de-voz-prato-design.md):

- **"Coffee shop" muda a estrutura?** Não — e mais: **não é cafeteria.** O dono
  do projeto confirmou em 19/08 que o Prato é um restaurante de almoço, e que o
  Fogão de Ouro (também restaurante de almoço) é a base correta. O documento de
  copy do cliente não menciona café uma única vez. A estrutura de restaurante
  fica, "cafeteria" sai da copy e dos documentos de instrução, e a razão social
  *Coffee Shop Refeições* continua só onde é registro (`legalName` em
  `site.ts`, `legal.ts`).
- **Horário, Instagram e tipo de cozinha** foram confirmados e publicados.

Continua aberta a pergunta **1 (preços no cardápio)**, e abriu-se uma nova: o
**número do endereço**, que o documento de copy diz ser 09 contra os 25
confirmados em 17/08.

### 4.2 Riscos técnicos

1. **Senha do admin:** [`prisma/seed.ts`](../../../prisma/seed.ts) usa `changeme123`
   por padrão. Nunca subir para produção assim — `SEED_ADMIN_PASSWORD` ou
   `npm run db:set-admin`.
2. **`DATABASE_URL`** no pooler do Supabase (6543, `?pgbouncer=true`) **sem**
   `connection_limit=1`.
3. **Bucket `media`** precisa existir no Storage do Supabase novo, senão o upload de
   imagem do admin falha.
4. **`SITE_INDEXABLE` continua `false`.** Só o texto exato `"true"` abre o site aos
   buscadores. Enquanto o `legal.ts` tiver `«PENDENTE»`, indexar é problema
   jurídico. Não mexer.
5. **`hero.tsx` tem `slideImages` vazio** — herdado, o hero já renderiza sem foto.
   Não é regressão nova; entra no PR 3 com as fotos.

---

## 5. Critérios de aceite (PR 1)

- `npm run typecheck && npm run lint && npm run build` verde.
- Nenhuma string "Fogão de Ouro", "fogaodeouro", "Frei Gaspar", "Bolsa do Café",
  "180 lugares", "1.200 avaliações" ou "por quilo" no site público.
- Nenhum ativo do cliente anterior no repositório (logo, PDF de copy).
- `legal.ts` e `site.ts` concordando entre si e refletindo o Prato.
- Nenhum dado do Prato inventado: o que não veio fica `«PENDENTE»` e visível.
- Toda string de UI em `pt.json`.
- Nenhum segredo em `NEXT_PUBLIC_*`.
- `AGENTS.md`, `CLAUDE.md`, `README.md`, `SECURITY.md` e `docs/` descrevendo o
  Restaurante Prato.
- Branch `Development` criada; `upstream` com push travado.
