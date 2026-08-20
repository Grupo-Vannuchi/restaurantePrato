# Contexto: white-label → Restaurante Prato

Este repositório é um **fork do site pronto do Fogão de Ouro**, um restaurante do
Centro Histórico de Santos — que por sua vez era um fork do site da agência N8X.
Ele está sendo re-skinado para o **Restaurante Prato**, restaurante na
R. Augusto Severo, 25, no Centro de Santos/SP.

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
| Natureza | Restaurante de almoço — buffet e churrasco na brasa; aceita reserva. **Não é cafeteria** *(corrigido em 19/08/2026)*. A razão social diz "Coffee Shop", mas isso é registro, não posicionamento |
| Horário | Segunda a sexta, das 11h às 15h *(19/08/2026)* |
| Instagram | [@restaurante.prato](https://instagram.com/restaurante.prato) *(19/08/2026)* |
| Cozinha | Brasileira, churrasco *(19/08/2026)* |

Esses valores vivem em dois arquivos que precisam concordar:
[`src/config/site.ts`](../src/config/site.ts) (marca, contato, structured data)
e [`src/content/legal.ts`](../src/content/legal.ts) (LGPD).

## Pendências — e o que cada uma trava

| Pendência | O que trava hoje |
|---|---|
| Paleta da marca | O tema em `site.ts` ainda é o herdado; sai no PR 2 |
| Logo | A marca é **tipográfica** (`src/components/layout/logo.tsx`, `icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`). Ver [`public/brand/README.md`](../public/brand/README.md) |
| Copy definitiva | ✅ Entregue em 19/08 e aplicada. O documento diverge do endereço confirmado (diz 09, o confirmado é 25) — ver a linha abaixo |
| **Número do endereço** | O documento de copy diz "Rua Augusto Severo, 09"; o dado confirmado em 17/08 e o CNPJ dizem **25**. Mantido 25 até o cliente responder. Acoplado a quatro lugares: `src/config/site.ts`, `src/content/legal.ts`, `metadata.description` e `experiencia.disclaimer` |
| Facebook | `social` só tem Instagram; o `sameAs` sai com um item |
| Fotos (hero e galeria) | O hero tem um slide e `slideImages` está vazio |
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
3. **PR 3 — copy e conteúdo** ✅ parcialmente (este plano:
   [`superpowers/plans/2026-08-19-copy-e-tom-de-voz-prato.md`](superpowers/plans/2026-08-19-copy-e-tom-de-voz-prato.md),
   spec [`superpowers/specs/2026-08-19-copy-e-tom-de-voz-prato-design.md`](superpowers/specs/2026-08-19-copy-e-tom-de-voz-prato-design.md)):
   copy definitiva, tom de voz, horário, Instagram e tipo de cozinha.
   **Falta:** fotos do hero e da galeria, cardápio e depoimentos pelo admin.

## Infra — no ar desde 20/08/2026

O site está publicado em **https://restaurante-prato.vercel.app**, fechado aos
buscadores (`SITE_INDEXABLE=false`) enquanto o domínio final for `«PENDENTE»`.

| Peça | Estado |
|---|---|
| Supabase | projeto `dkgqqqazdrwulcmnyvft`, região `sa-east-1`; 22 migrações aplicadas, 9 tabelas |
| Bucket `media` | criado e público |
| Data API | **desabilitada** — verificado tentando ler `admin_users` e `leads` com a chave publishable |
| Vercel | projeto `restaurante-prato`, escopo `moraesvannuchi-debugs-projects`, região `gru1`, ligado a `Grupo-Vannuchi/restaurantePrato` |
| Variáveis | 7 em Production, incluindo `SESSION_SECRET` gerado do zero |
| Primeiro admin | criado com `db:set-admin`; o placeholder `admin@example.com` não existe |

⚠️ **`vercel git connect` oferece o `upstream` primeiro.** A lista de remotes
começa pelo repositório do Fogão de Ouro; aceitar o padrão ligaria o projeto do
Prato ao repo do outro cliente. Passe a URL explícita.

**Ainda não provisionados:** Upstash (o rate limit cai para memória, que não
sobrevive entre instâncias serverless) e a instância Evolution da notificação de
lead. Os passos estão em [`RUNBOOK.md`](RUNBOOK.md).

⚠️ `prisma/seed.ts` cria o admin com a senha padrão `changeme123` quando
`SEED_ADMIN_PASSWORD` não está definida. Nunca subir para produção assim.
