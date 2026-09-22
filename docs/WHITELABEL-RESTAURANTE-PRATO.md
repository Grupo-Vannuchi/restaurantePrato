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
marca ("180 lugares", "Bolsa do Café").

⚠️ **"por quilo" saiu dessa lista em 31/08**, e é o único item que já saiu. Ele
estava lá por ser um fato do Fogão de Ouro afirmado sem prova; nessa data o
cliente confirmou que o Prato também cobra o buffet por peso, então virou dado
confirmado. Nenhum outro item sai sem confirmação explícita — "Centro Histórico"
segue bloqueado justamente por ser o caso ainda em aberto. `docs/` fica fora de
propósito: veja [`superpowers/README.md`](superpowers/README.md).

---

## Dados confirmados (17/08/2026)

| Campo | Valor |
|---|---|
| Nome fantasia | Restaurante Prato |
| Razão social | PRATO COFFEE SHOP REFEICOES LTDA |
| CNPJ | 03.354.096/0001-84 |
| Endereço | R. Augusto Severo, 25 — Centro, Santos/SP, CEP 11010-050. O número **25** foi confirmado por fotografia da fachada em 03/09/2026: a placa está no pilar entre as duas entradas, sob os toldos do Prato *(ver a nota abaixo da tabela de pendências)* |
| E-mail | pratocoffee@gmail.com |
| WhatsApp | 5513978208568 · exibido `+55 (13) 97820-8568` |
| Fundação | 1998 |
| Natureza | Restaurante de almoço — buffet e churrasco na brasa; aceita reserva. **Não é cafeteria** *(corrigido em 19/08/2026)*. A razão social diz "Coffee Shop", mas isso é registro, não posicionamento |
| Horário | Segunda a sexta, das 11h às 15h *(19/08/2026)* |
| Instagram | [@restaurante.prato](https://instagram.com/restaurante.prato) *(19/08/2026)* |
| Cozinha | Brasileira, churrasco *(19/08/2026)* |
| Cobrança | Buffet **por quilo**, cobrado pelo peso do prato montado *(31/08/2026)*. Os valores ainda não vieram |
| Ilha de massas | Existe, e tem **preço próprio**, à parte do buffet *(31/08/2026)*. A composição — dez formatos, dois preparos, seis molhos, porção de 190 g e até cinco ingredientes — foi confirmada em 03/09/2026 como a mesma do projeto irmão. O valor da porção e o dos dois adicionais ainda não vieram |
| Sobremesas e bebidas | Onze sobremesas e onze bebidas, transcritas do quadro do salão fotografado em 02–03/09/2026, **com preço por item** — elas não entram no valor por quilo. Falta o preço da Heineken, que não tem etiqueta no quadro |
| Cardápio do buffet | **111 pratos** em **quinze listas** — cinco dias × três semanas. O papel cresceu em três entregas: 5 listas em 03/09, 10 em 17/09 e 15 em **21/09/2026**. Entram por `scripts/importa-cardapio.mjs`, que recusa a carga se alguma lista não fechar com a do cliente. ⚠️ A rotação de semana **não cabe no modelo** (`MenuItem.weekdays` é `Int[]` de 1 a 5): o banco recebe a UNIÃO, e a semana fica preservada nos tokens da fonte |

Esses valores vivem em dois arquivos que precisam concordar:
[`src/config/site.ts`](../src/config/site.ts) (marca, contato, structured data)
e [`src/content/legal.ts`](../src/content/legal.ts) (LGPD).

## Pendências — e o que cada uma trava

| Pendência | O que trava hoje |
|---|---|
| Logo | ✅ Entregue em 09/09/2026 e aplicada em toda superfície: marca, favicon, ícone do iPhone e cartão de compartilhamento. **Falta o vetor** — o que chegou é PNG, e material impresso pede `.ai`/`.eps`/`.svg`. Ver [`public/brand/README.md`](../public/brand/README.md) |
| Copy definitiva | ✅ Entregue em 19/08 e aplicada |
| Facebook | `social` só tem Instagram; o `sameAs` sai com um item |
| Fotos | ✅ Dez fotos autorais entraram em 03/09/2026 — topo da home, abertura do cardápio, três na ilha de massas e seis na galeria. **Falta** foto de sobremesa: a linha da sobremesa tem campo de imagem e hoje ocupa a largura toda sem ele |
| Domínio final | ✅ **No ar desde 22/09/2026: `restauranteprato.com.br`**, servido pela Vercel em `gru1`, com `www` redirecionando 308 para o apex e o caminho preservado. O `«PENDENTE»` de `src/content/legal.ts` **saiu** — `pendenciasLegais()` devolve lista vazia, e era a última pendência jurídica do projeto. ⚠️ **Falta a titularidade:** o registro segue no CNPJ do cliente anterior. Ver a nota abaixo |
| Telefone fixo | Não existe: `contact.phone` é opcional e cada CTA de ligar some sozinho |
| Cardápio | ✅ Buffet, ilha de massas, sobremesas, bebidas e carta de vinhos estão no ar. **Falta** o preço do quilo, o da porção de massa e o dos adicionais — sem eles o aviso de preço some sozinho. Os pratos do buffet vivem no banco e entram por script versionado; sobremesas, bebidas e vinhos vivem no código |


⚠️ **O domínio foi decidido em 21/09/2026 — e a verificação mudou a tarefa de
"comprar" para "transferir".** O dono informou `restauranteprato.com.br` como
domínio final, dizendo que ainda não havia sido comprado. Consulta ao RDAP do
registro.br na mesma data:

| Campo | Valor |
|---|---|
| Estado | **ativo** |
| Registro | 17/08/2026 · expira 17/08/2027 |
| Titular | **`fogao de ouro restaurante`** — CNPJ **04.160.109/0001-47** |
| Servidores de nome | `lunar.dns-parking.com` · `solar.dns-parking.com` (Hostinger) |
| O que serve | `Parked Domain name on Hostinger DNS system`, com `noindex` |

**A data é a explicação mais provável:** 17/08/2026 é exatamente o dia em que os
dados do Prato foram confirmados e este projeto começou. A leitura é que o
domínio do Prato foi registrado no dia um pela própria equipe, usando o CNPJ que
já estava na conta do registro.br — o do cliente ANTERIOR. Não é terceiro na
frente; é titularidade trocada.

**Por que não é só burocracia:** os documentos legais deste site nomeiam
`PRATO COFFEE SHOP REFEICOES LTDA` como controladora dos dados. Domínio em nome
de outra empresa cria inconsistência exatamente no documento onde ela importa —
e renovação, acesso ao DNS e qualquer disputa passam pela conta da outra
empresa.

**A sequência para destravar o site, nesta ordem:**

1. **transferir a titularidade** para o CNPJ do Prato (03.354.096/0001-84) no
   registro.br — ou decidir por escrito manter como está;
2. **apontar o domínio para a Vercel** — hoje ele aponta para o parking da
   Hostinger. Passos em [`RUNBOOK.md`](RUNBOOK.md);
3. **só então** preencher o `«PENDENTE»` de `src/content/legal.ts`, ajustar
   `NEXT_PUBLIC_SITE_URL` e ligar `SITE_INDEXABLE=true`.

⚠️ **O passo 3 não pode vir antes do 2, e isso é decisão registrada, não
esquecimento.** Preencher o domínio no texto legal enquanto ele serve uma página
de estacionamento faria os Termos de Uso nomearem um endereço que não é o site —
trocaria uma pendência honesta por uma afirmação falsa. A trava de
`impedimentoParaIndexar()` continua correta e continua fechada.

⚠️ **O número do endereço saiu desta lista em 03/09/2026, e o motivo precisa
sobreviver ao apagamento.** O documento de copy entregue pelo cliente escrevia
"Rua Augusto Severo, 09" em dois lugares; o dado confirmado em 17/08 e o CNPJ
diziam 25. O projeto manteve 25 e deixou a divergência aberta. Ela fechou
quando chegou a fotografia da fachada: a placa diz **25**.

Guardar isso escrito não é zelo excessivo. Quem abrir o documento de copy daqui
a seis meses vai ler 09 e reabrir a discussão, e o registro é o que responde
antes de alguém trocar o número no código.

O endereço aparece em **sete** lugares em `src/`, e não nos quatro que a
pendência antiga listava: `config/site.ts`, `content/legal.ts` e cinco strings
em `messages/pt.json` — a descrição de metadados da home, o aviso da
experiência, as descrições da galeria e do contato, e o subtítulo do contato.
Todos já dizem 25; uma varredura por "09" em `src/` não encontra nada. A lista
de quatro envelheceu porque páginas novas foram acrescentando o endereço à
copy, e é por isso que a nota acima não repete uma lista: ela envelheceria de
novo.

## Sequência de PRs

1. **PR 1 — o repo deixa de ser o Fogão de Ouro** ✅ (este plano:
   [`superpowers/plans/2026-08-17-rebrand-prato-pr1.md`](superpowers/plans/2026-08-17-rebrand-prato-pr1.md)):
   campos opcionais, dados do cliente, marca tipográfica interina, copy
   neutralizada, documentação.
2. **PR 2 — identidade visual** ✅ parcialmente: a **paleta chegou em 26/08** e
   está aplicada, com o site passando a ter uma cara só (sem alternador de
   tema). Ver a seção *Brand & theme* do [`AGENTS.md`](../AGENTS.md) para as
   duas cores que precisaram de regra de uso, e `test/palette-contrast.test.ts`
   para a verificação. **Falta:** logo, ícones e imagem OG voltando a ser
   imagem — **fechado em 09/09/2026**: a logo chegou e entrou na marca, no
   favicon, no ícone do iPhone e no cartão de compartilhamento, que deixou de
   ser um cartão de texto e passou a ser a foto do buffet com a marca por cima.
   Falta só o vetor, para impressão.
3. **PR 3 — copy e conteúdo** ✅ parcialmente (este plano:
   [`superpowers/plans/2026-08-19-copy-e-tom-de-voz-prato.md`](superpowers/plans/2026-08-19-copy-e-tom-de-voz-prato.md),
   spec [`superpowers/specs/2026-08-19-copy-e-tom-de-voz-prato-design.md`](superpowers/specs/2026-08-19-copy-e-tom-de-voz-prato-design.md)):
   copy definitiva, tom de voz, horário, Instagram e tipo de cozinha.
   As **fotos** entraram em 03/09 e o **cardápio** também — buffet, ilha de
   massas, sobremesas, bebidas e carta de vinhos. **Falta:** os depoimentos, os
   preços que ainda não vieram do cliente. A **carta de vinhos foi confirmada
   em 04/09**: é a mesma do projeto irmão, reafirmada depois de eu apontar que a
   garrafa da foto do salão é outra — o registro dessa troca está em
   `config/menu.ts`, para a foto não reabrir a pergunta.

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
