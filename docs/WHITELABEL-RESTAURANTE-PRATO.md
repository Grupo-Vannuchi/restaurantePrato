# Contexto: white-label → Restaurante Prato

Este repositório é um **fork do site pronto do Fogão de Ouro**, um restaurante do
Centro Histórico de Santos — que por sua vez era um fork do site da agência N8X.
Ele está sendo re-skinado para o **Restaurante Prato**, restaurante e cafeteria
na R. Augusto Severo, 25, no Centro de Santos/SP.

**A estrutura de restaurante não muda.** Rotas, cardápio, galeria, reservas por
WhatsApp, schema.org `Restaurant`, PT-only, admin com seis seções — tudo isso é
exatamente o que se quer reaproveitar. O trabalho é trocar dado de cliente,
marca e copy.

**Leia antes de mexer:** [`AGENTS.md`](../AGENTS.md),
[`docs/ARCHITECTURE.md`](ARCHITECTURE.md), o spec do rebrand
[`superpowers/specs/2026-08-17-whitelabel-restaurante-prato-design.md`](superpowers/specs/2026-08-17-whitelabel-restaurante-prato-design.md)
e `node_modules/next/dist/docs/` (é Next 16 + Turbopack, não o Next do seu
treinamento).

---

## A regra que rege tudo

**Nunca invente dado do cliente.** Substituir só quando existe fato confirmado;
**remover** quando não existe. Nunca aproximar, nunca herdar o valor do cliente
anterior "só para não ficar vazio" — um horário errado manda o visitante para a
porta fechada, e um CNPJ errado em documento de LGPD é problema jurídico.

Uma guarda de regressão em Vitest (`test/brand-hygiene.test.ts`) varre `src/`,
`public/`, `prisma/` e os documentos de instrução da raiz atrás de qualquer
vestígio do cliente anterior — inclusive os fatos que ele afirmava sem citar a
marca ("180 lugares", "por quilo", "Bolsa do Café"). `docs/` fica fora de
propósito: veja [`superpowers/README.md`](superpowers/README.md).

---

## Dados confirmados (17/08/2026)

| Campo | Valor |
|---|---|
| Nome fantasia | Restaurante Prato |
| Razão social | PRATO COFFEE SHOP REFEICOES LTDA |
| CNPJ | 03.354.096/0001-84 |
| Endereço | R. Augusto Severo, 25 — Centro, Santos/SP, CEP 11010-050 |
| E-mail | pratocoffee@gmail.com |
| WhatsApp | 5513978208568 · exibido `+55 (13) 97820-8568` |
| Fundação | 1998 |
| Natureza | Restaurante **e** cafeteria; aceita reserva |

Esses valores vivem em dois arquivos que precisam concordar:
[`src/config/site.ts`](../src/config/site.ts) (marca, contato, structured data)
e [`src/content/legal.ts`](../src/content/legal.ts) (LGPD).

## Pendências — e o que cada uma trava

| Pendência | O que trava hoje |
|---|---|
| Horário de funcionamento | `openingHours` é opcional e está omitido: some o `openingHoursSpecification` do schema, o `Fact` de horário em `/reservas` e a linha de horário do `/llms.txt` e da imagem OG |
| Paleta da marca | O tema em `site.ts` ainda é o herdado; sai no PR 2 |
| Logo | A marca é **tipográfica** (`src/components/layout/logo.tsx`, `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`). Ver [`public/brand/README.md`](../public/brand/README.md) |
| Copy definitiva | O catálogo `src/messages/pt.json` está no mínimo verdadeiro; entra no PR 3 |
| Fotos (hero e galeria) | O hero tem um slide e `slideImages` está vazio |
| Tipo de cozinha | `servesCuisine` é opcional e está omitido |
| Instagram / Facebook | `social` está vazio, então `sameAs` sai do grafo sozinho |
| Domínio final | `«PENDENTE»` em `src/content/legal.ts`; **enquanto existir, `SITE_INDEXABLE` fica `false`** |
| Telefone fixo | Não existe: `contact.phone` é opcional e cada CTA de ligar some sozinho |
| Cardápio | Categorias, itens e fotos entram pelo admin, não pelo código |

## Sequência de PRs

1. **PR 1 — o repo deixa de ser o Fogão de Ouro** ✅ (este plano:
   [`superpowers/plans/2026-08-17-rebrand-prato-pr1.md`](superpowers/plans/2026-08-17-rebrand-prato-pr1.md)):
   campos opcionais, dados do cliente, marca tipográfica interina, copy
   neutralizada, documentação.
2. **PR 2 — identidade visual:** paleta do Prato (validar com
   `node docs/superpowers/specs/2026-08-07-palette-contrast.mjs`), logo, ícones e
   imagem OG voltando a ser imagem.
3. **PR 3 — copy e conteúdo:** textos definitivos, horário de funcionamento,
   fotos do hero e da galeria, cardápio pelo admin.

## Infra — ainda para criar

Projeto novo no Supabase (com o bucket público `media` e a Data API desabilitada)
e projeto novo na Vercel, com `SESSION_SECRET` gerado do zero, `DATABASE_URL`
(pooler 6543, `?pgbouncer=true`, **sem** `connection_limit=1`), `DIRECT_URL`
(5432), `NEXT_PUBLIC_SITE_URL`, Upstash e uma instância Evolution nova para a
notificação de leads. Os passos estão em [`RUNBOOK.md`](RUNBOOK.md).

⚠️ `prisma/seed.ts` cria o admin com a senha padrão `changeme123` quando
`SEED_ADMIN_PASSWORD` não está definida. Nunca subir para produção assim.
