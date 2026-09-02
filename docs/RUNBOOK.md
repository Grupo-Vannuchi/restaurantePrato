# Runbook (operations)

Operational, manual-step playbooks for the integrations that keep this system
running. For local restore/snapshot see [`../SNAPSHOT.md`](../SNAPSHOT.md); for
the production deploy basics see SNAPSHOT.md too.

> ⚠️ Secrets (DB password, API keys, tokens) live in Vercel env vars and the
> local `.env`. Never paste them into commits, chats or screenshots.

## Environment variables

| Var | Where | Notes |
|---|---|---|
| `DATABASE_URL` | Vercel + local | Supabase **pooled** (6543) `?pgbouncer=true`. Mark **Sensitive** on Vercel. ⚠️ Do **not** add `connection_limit=1` — PgBouncer already pools, and `=1` breaks the build's concurrent prerender (`P2024`). |
| `DIRECT_URL` | Vercel + local | Supabase **session pooler** (5432), migrations only. |
| `SESSION_SECRET` | Vercel + local | JWT session signing. |
| `NEXT_PUBLIC_SITE_URL` | Vercel + local | Inlined at build — set before the first build. |
| `EVOLUTION_BASE_URL` / `EVOLUTION_API_KEY` | server | Evolution server + global key. |
| `EVOLUTION_INSTANCE` | server | Default WhatsApp instance (explicit override wins). |
| `WHATSAPP_INBOX_URL` | server | External conversation inbox link (metodon8n / Chatwoot). |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel (Upstash) | Rate-limit store. Absent locally → in-memory fallback. |
| `SUPABASE_URL` / `SUPABASE_SECRET_KEY` | server | Storage para o upload de imagem do admin. Sem elas o upload é desabilitado. **Nunca** `NEXT_PUBLIC_*`. |
| `SITE_INDEXABLE` | Vercel + local | **Padrão `false` — o site nasce fechado aos buscadores.** Só a string exata `"true"` abre. Ver "Publicar de verdade", abaixo. |
| `SUPABASE_BUCKET` | server (opcional) | Nome do bucket público. Padrão `media`. Defina só se o bucket do projeto tiver outro nome — com o nome errado o upload falha e o admin mostra "Bucket não encontrado". |

O template completo, com o porquê de cada uma, está em
[`.env.example`](../.env.example) — versionado e sem valor nenhum.

⚠️ **Use `.env`, não `.env.local`.** O Next lê os dois, mas o **Prisma CLI só lê
`.env`** — e é ele que roda `migrate deploy` no build. Uma URL de banco que
exista só no `.env.local` faz a migração falhar no deploy.

**Editing a Sensitive var on Vercel:** the value is write-only — you must re-paste
the whole value (it can't be partially edited). Then **Redeploy**.

## Supabase — criar o projeto do zero

Ordem importa: o banco precisa existir antes do primeiro deploy, porque o
`buildCommand` da Vercel é `npx prisma migrate deploy && next build`.

1. **Criar o projeto** em [supabase.com](https://supabase.com). Região
   **`sa-east-1` (São Paulo)** — o público é de Santos. Guarde a senha do banco
   no gerenciador de senhas: o Supabase **não a mostra de novo**.
2. **Copiar as duas URLs** em *Project Settings → Database → Connection string*:
   - **Transaction pooler, porta 6543** → `DATABASE_URL`, com `?pgbouncer=true`.
     ⚠️ **Não** acrescente `connection_limit=1`.
   - **Session pooler, porta 5432** → `DIRECT_URL`, só para migração.

   Use o *pooler* nas duas, não o host direto `db.<ref>.supabase.co`: a conexão
   direta é **IPv6-only** e o build da Vercel não a alcança.
3. **Storage → New bucket → `media`, público.** Sem ele o upload de imagem do
   admin falha — e é por ali que entram as fotos do cardápio e da galeria.
   Se o bucket já existir com outro nome, **não renomeie o código**: defina
   `SUPABASE_BUCKET` com o nome real (diferencia maiúsculas). Com o nome
   errado o Supabase devolve `Bucket not found` (HTTP 400, `NoSuchBucket`) e o
   admin avisa "Bucket não encontrado no storage" em vez de uma falha genérica.
4. **Manter a Data API desabilitada** (*Project Settings → API*). O app fala
   direto por Prisma e não usa RLS; deixar a API ligada expõe as tabelas sem
   política nenhuma protegendo-as.
5. **Configurar tudo na Vercel antes do primeiro deploy** — inclusive um
   `SESSION_SECRET` **novo**, não o de desenvolvimento.
6. **Depois do deploy, criar o primeiro admin** — ver a seção abaixo. O build
   nunca roda o seed, então o banco sobe migrado e **sem usuário nenhum**.

O desenvolvimento local **continua no Postgres do Docker** (`docker compose up -d`,
porta 5433). É de propósito: dá para zerar e testar migração destrutiva sem
tocar no banco do cliente.

## Google Calendar — removido

A integração existia apenas para os endings do tipo MEETING dos funis e saiu
junto com eles em agosto de 2026. Não há mais OAuth para reconectar, nem
`GOOGLE_*` para configurar na Vercel.

## WhatsApp (Evolution) instances

Admin → `Contatos → Instâncias do WhatsApp` (`/admin/leads/whatsapp`):

- **Create** an instance → scan the **QR** with WhatsApp → it polls until
  connected (`open`).
- **Reconnect / Logout / Delete** per instance.
- The lead-notification config (`/admin/leads`) picks which instance + group
  receives new-lead pushes — both are required for it to send.
- **Conversations** are not rebuilt here — the "Conversas" button opens the
  external inbox (`WHATSAPP_INBOX_URL`). See ADR-0005.

> Instance management requires the **global** Evolution API key. With an
> instance-scoped key, `fetchInstances`/`create` may be forbidden.

## Rate limiting (Upstash / Vercel KV)

- Provision: Vercel → project → **Storage → Create Database → Upstash (Redis)**,
  connect to the project with prefix `KV` (creates `KV_REST_API_URL/TOKEN`).
  Keep **Sensitive** on; don't enable the Development environment (Sensitive vars
  can't be pulled locally — local uses the in-memory fallback).
- Limits (per IP, sliding window): `submitContactLead` (the contact form) 5/min.
  Adjust in `src/lib/rate-limit.ts` call sites. The limiter **fails open**.

## Deploy

1. Merge `Development → main`. Vercel builds from `main` (region `gru1`):
   `prisma migrate deploy && next build` (see `vercel.json`). Migrations apply
   automatically — author them locally with `prisma migrate dev` first.
2. Verify the new env vars exist before the build needs them.
3. **Create the first admin user — the build does not.** See below; on a brand
   new database nobody can log in until this is done.
4. Post-deploy: check the security response headers in DevTools → Network
   (`strict-transport-security`, `x-frame-options`, …) on a real (HTTPS) page.
5. **Node:** o `engines` do `package.json` fixa `22.x` de propósito (commit
   `fa13e96`), e ele bate com o `.nvmrc`, com os dois workflows da CI e com o
   `@types/node`. A Project Setting da Vercel diz **24.x** e é sobrescrita a cada
   build, que emite advertência. **Ajuste a Vercel para 22.x** — não mexa no
   `engines`. Subir para o Node 24 é uma mudança própria, validada.

## Publicar de verdade — `SITE_INDEXABLE`

O site **nasce fechado aos buscadores**. Com a variável ausente ou `"false"`:

- `/robots.txt` devolve `Disallow: /` para todos os agentes, sem `Sitemap:`
- toda página carrega `<meta name="robots" content="noindex, nofollow">`

Isso é deliberado, e o motivo está no topo de
[`src/content/legal.ts`](../src/content/legal.ts): **não publicar enquanto houver
`«PENDENTE»`**. Hoje resta um — o domínio final —, e ele é citado dentro da
Política de Privacidade e dos Termos. Um site indexado declarando um domínio que
não existe é pior que um site invisível.

⚠️ **Isso deixou de ser combinado e virou trava.** Desde 20/08/2026,
`SITE_INDEXABLE=true` com qualquer `«PENDENTE»` em `src/content/legal.ts`
**derruba o build** — a falha estoura na coleta do `/robots.txt`, que é
justamente a página que abriria o site, e a mensagem diz qual campo falta. Não
há como abrir por engano, e não há como abrir por pressa. Se você precisa abrir,
o caminho é preencher o dado, não contornar a trava.

Some aí o fato de que `canonical`, `sitemap` e as imagens de compartilhamento
apontam para o host configurado em `NEXT_PUBLIC_SITE_URL`. Indexar o
`.vercel.app` antes do domínio real põe o endereço errado no índice do Google, e
tirar de lá leva semanas.

**Para abrir**, quando o domínio existir e o conteúdo estiver cadastrado:

1. `SITE_INDEXABLE=true` na Vercel (a string exata — qualquer outro valor derruba
   o build em vez de abrir o site por engano)
2. `NEXT_PUBLIC_SITE_URL` no domínio final
3. Redeploy — as duas são lidas no **build**, não em runtime

Confira depois, no ar: `curl https://<dominio>/robots.txt` tem que trazer as três
regras e a linha `Sitemap:`, e o HTML não pode mais ter `noindex`.

## Hook de pre-push

`.githooks/pre-push` roda `npm run typecheck` antes de todo push.

Ele existe porque o [`src/messages/pt.json`](../src/messages/pt.json) — o catálogo
de UI inteiro num arquivo só — já regrediu **duas vezes**. Na segunda, um estado
antigo do arquivo foi salvo por cima do atual e derrubou o deploy da Vercel, a CI
e o E2E **ao mesmo tempo**. A detecção nunca faltou: o catálogo é tipado a partir
do próprio JSON, então consumidor órfão é erro de compilação. O que faltava era
rodar o typecheck **antes** do push.

Três coisas que um clone novo precisa saber:

- O hook só passa a valer depois de `npm install` — é o `postinstall` que aponta
  o `core.hooksPath` para `.githooks/`.
- `core.hooksPath` **substitui o `.git/hooks` inteiro**: hook novo vai em
  `.githooks/`, ou não roda.
- `git push --no-verify` pula o hook, quando for uma decisão consciente.

## Bootstrapping the first admin user

> ⚠️ **The seed does not run on Vercel.** `vercel.json` sets
> `buildCommand: "npx prisma migrate deploy && next build"` — `prisma db seed`
> is never invoked, and `migrate deploy` does not seed. A freshly deployed
> environment has the schema and **zero admin users**. Creating the first one is
> a manual step.

Run this once, from a machine whose `DATABASE_URL` points at the target
database (use the direct/session-pooler URL, port 5432):

```bash
DATABASE_URL="<target DIRECT_URL>" \
ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="<strong password>" \
npm run db:set-admin
```

`npm run db:set-admin` (`prisma/set-admin.ts`) is the preferred path: it
**requires** both variables, rejects passwords shorter than 8 characters, and
deletes the `admin@example.com` placeholder if one exists.

The alternative is a manual `npm run db:seed`, but only with the seed variables
set explicitly:

```bash
SEED_ADMIN_EMAIL="you@example.com" SEED_ADMIN_PASSWORD="<strong password>" npm run db:seed
```

🛑 **Never ship `changeme123`.** `prisma/seed.ts` silently falls back to
`admin@example.com` / `changeme123` when `SEED_ADMIN_PASSWORD` is unset. Since
the build never seeds, the only way that password reaches a public environment
is somebody running `npm run db:seed` by hand against it — so don't, unless
both variables are set. If it ever happens, rotate immediately with
`db:set-admin`. Verify before announcing a deploy: log in, and confirm
`admin@example.com` no longer exists.

Everything else about the site — cardápio, galeria, avaliações, novidades — is
then entered through the admin panel. A new environment legitimately starts with
an **empty** public site; that is the expected state, not a failed deploy.

## Backup do conteúdo

```bash
DATABASE_URL="<url do banco>" npm run db:export
```

Grava `prisma/backups/conteudo-<data>.json` com cardápio, galeria, novidades,
depoimentos, contatos e a configuração de notificação. O nome é ordenável, e o
arquivo traz a data e a contagem de cada tabela no topo — um backup que parece
completo e está vazio é pior que backup nenhum, porque adia a descoberta.

**Por que existe, se o Supabase tem backup próprio.** O backup do provedor
serve para catástrofe: banco corrompido, projeto apagado. Ele não serve para o
acidente comum — alguém excluir uma categoria do cardápio com trinta pratos
dentro (`onDelete: Cascade`) numa terça-feira. E não depende do plano.

**Por que JSON e não `pg_dump`.** O `pg_dump` não está instalado na máquina de
desenvolvimento: o `npm run db:dump` funciona porque roda *dentro* do contêiner
Docker, e contra o Supabase não serve. O `db:export` fala pelo Prisma e roda em
qualquer lugar que rode o projeto.

⚠️ **O arquivo contém dado pessoal.** Os contatos trazem nome, e-mail, telefone
e mensagem. O `.gitignore` cobre `prisma/backups/*` — com uma exceção
consciente para o `snapshot.sql`, que é o retrato do banco **local** e não tem
contato nenhum. **Este repositório é público:** não versione, não anexe em
chat, trate como a senha do banco.

O hash da senha do admin fica de fora de propósito. Sem ele o arquivo deixa de
ser material de invasão, e a perda é nenhuma: recriar o acesso é um comando
(`db:set-admin`), enquanto um hash vazado é permanente.

### Restaurar

```
DATABASE_URL="<url do banco>" npm run db:import -- prisma/backups/conteudo-<data>.json
DATABASE_URL="<url do banco>" npm run db:import -- <arquivo> --confirmar
```

**Sem `--confirmar` ele não toca no banco.** Lê, confere e imprime o que faria.
Restaurar é operação que se faz com pressa, depois de já ter perdido alguma
coisa, e apontar para o banco errado é o acidente mais fácil de cometer — o
ensaio é a chance de ver o destino antes de escrever nele.

**Confere o arquivo antes de aceitar.** É para isso que a contagem existe no
topo do backup: download interrompido ou arquivo colado pela metade chega com a
promessa e sem o conteúdo, e restaurar isso em silêncio apaga a diferença sem
ninguém ver. O comando recusa e lista **todos** os problemas de uma vez, em vez
de um por rodada.

**Não apaga nada, e pode rodar duas vezes.** A escrita é `upsert` linha a
linha: o que existe e não está no arquivo continua lá, e repetir dá o mesmo
resultado que rodar uma vez. Restaurar não deveria ser uma segunda forma de
perder dado.

⚠️ **O admin não volta pelo backup** — o arquivo não traz o hash da senha. O
comando avisa e segue; o caminho é `npm run db:set-admin`.

⚠️ **O caminho de escrita (`--confirmar`) ainda não foi exercido contra um banco
de verdade.** Em 20/08/2026 validou-se a leitura, a validação, a ordem de
inserção e o ensaio — inclusive a recusa de arquivo truncado, com arquivo
corrompido de propósito. A escrita não foi testada porque o banco Docker local
estava desligado e o banco de produção não é bancada de teste. **Antes de contar
com ele num aperto, ensaie uma restauração completa no Docker local.**

⚠️ **A suíte E2E escreve, se você deixar.** `e2e/contact.spec.ts` envia o
formulário de verdade. Contra um site publicado ele se pula sozinho; para rodar
de propósito, `E2E_ALLOW_WRITES=1` — e a limpeza é sua. Em 20/08/2026 duas
execuções da suíte completa contra o deploy deixaram dois contatos "Ana E2E" na
lista do restaurante antes de a trava existir.

## Local development

```bash
docker compose up -d   # Postgres (container n8x-marketing-db, host port 5433)
npm install
npm run db:restore     # exact snapshot, OR db:migrate + db:seed (see SNAPSHOT.md)
npm run dev            # http://localhost:3000
```

Either path leaves you with one admin user and **no content** — the site renders
its empty states until you add content through `/admin`. Locally the placeholder
`admin@example.com` / `changeme123` is fine; to set a real one, run
`ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run db:set-admin`.

## Git remotes — disable pushing to `upstream` (every fresh clone)

Run this once, right after cloning:

```bash
git remote set-url --push upstream no_push
git remote -v            # the upstream (push) line must read: no_push
```

**Why.** This repo is a **fork of another restaurant's site**, and `upstream`
still points at `https://github.com/Grupo-Vannuchi/FogaoDeOuro.git` — that
project's own repository — with push enabled by default. A single mistyped
`git push upstream` would publish **this client's site into the other client's
repository**: the Restaurante Prato brand, content and history, in a repo that
belongs to a different business and has a different audience. The command above
makes that push fail immediately instead of succeeding quietly.

**`origin` is `Grupo-Vannuchi/restaurantePrato`** (público), na mesma
organização do `FogaoDeOuro` e dos demais sites de cliente. O repositório
pessoal onde o fork nasceu continua alcançável como o remote `victor`
(`Victor227br/restaurantePrato`) — **também com o push travado em `no_push`**,
porque a conta que trabalha aqui não tem escrita lá e um push acidental só
produziria um erro confuso:

```bash
git remote set-url --push victor no_push
```

⚠️ **O push exige o escopo `workflow` no token do GitHub.** A história versiona
`.github/workflows/ci.yml`, e o GitHub recusa qualquer *Personal Access Token*
sem esse escopo que crie ou altere um arquivo de workflow — a mensagem é
`refusing to allow a Personal Access Token to create or update workflow`. Uma
credencial só com `repo` empurra tudo, menos este projeto. Resolver:
`gh auth refresh -h github.com -s workflow`. Se o `git` estiver usando o
Gerenciador de Credenciais do Windows em vez do `gh`, o escopo novo não chega
até ele; aponte o repositório para o `gh`:

```bash
git config --local --replace-all credential.helper ""
git config --local --add credential.helper '!gh auth git-credential'
```

⚠️ This lives in `.git/config`, which is **not versioned** — a fresh clone does
not inherit it, and neither does a second working copy on another machine. It
has to be re-run per clone. Don't remove it as "leftover config": fetching from
`upstream` still works, only pushing is blocked, which is exactly the intent.

✅ **A infraestrutura do Prato existe desde 20/08/2026.** O Supabase
(`dkgqqqazdrwulcmnyvft`, `sa-east-1`, bucket `media` público, Data API
desligada), o projeto `restaurante-prato` na Vercel (escopo
`moraesvannuchi-debugs-projects`, região `gru1`) e o primeiro admin já estão de
pé; o site responde em https://restaurante-prato.vercel.app, fechado aos
buscadores. **Continuam por provisionar** o par do Upstash e uma instância
Evolution nova para a notificação de lead. Nunca reaproveitar credencial do
projeto anterior.

⚠️ **`vercel git connect` lista o `upstream` primeiro.** Num clone deste repo a
lista de remotes começa pelo `Grupo-Vannuchi/FogaoDeOuro`; aceitar o padrão
ligaria o projeto do Prato ao repositório do outro cliente. Passe a URL:

```bash
vercel git connect https://github.com/Grupo-Vannuchi/restaurantePrato.git --yes
```

⚠️ **Um projeto criado com `vercel project add` nasce sem framework.** Sem
código para inspecionar, a Vercel registra o preset como *Other*, que serve
`public/` como site estático. Por isso o `vercel.json` declara
`"framework": "nextjs"` — o valor do arquivo tem precedência sobre o painel.

## Instagram — ligar o feed da home

A seção existe no código e **nasce desligada**: sem as variáveis ela não
renderiza, e o site funciona igual. Ligar é preencher variáveis, sem tocar em
código.

### Qual API, e por quê

**Instagram API with Instagram Login** (`graph.instagram.com`). A Basic Display
API, que a maioria dos tutoriais ainda ensina, foi **descontinuada pela Meta em
dezembro de 2024**. Das duas modalidades que restaram, esta é a que **não exige
Página do Facebook** vinculada — a outra (`Instagram API with Facebook Login`,
em `graph.facebook.com`) exige. O Prato quer mostrar os próprios posts; amarrar
isso a uma Página seria uma dependência que o restaurante não tem, e mais uma
coisa para quebrar quando alguém desvincular.

Exige **conta profissional** (Business ou Creator). Conta pessoal não é
suportada, e a conversão é gratuita, pelo app do Instagram.

### Passo a passo na Meta

1. **developers.facebook.com** → *My Apps* → *Create App* → caso de uso
   **"Other"** → tipo **Business**.
2. No painel do app, adicione o produto **Instagram** → *API setup with
   Instagram login*.
3. Em **Business login settings**, cadastre uma *OAuth redirect URI*.

   ⚠️ **O domínio final do Prato ainda é `«PENDENTE»`.** Use por enquanto
   `https://restaurante-prato.vercel.app/`. A URI só precisa bater com a que
   você usar na URL de autorização, e o fluxo é feito uma vez, à mão — então
   trocar depois é refazer o passo 4, não uma migração.

4. Ainda em *API setup*, seção **Generate access tokens**: adicione a conta
   **@restaurante.prato** e clique em *Generate token*. A Meta abre o login do
   Instagram e devolve um **token de curta duração (1 hora)**.

   Peça **apenas** `instagram_business_basic`. Publicar, comentar e responder
   mensagem não são necessários para exibir post, e permissão a mais é
   superfície a mais.

5. **Troque por um token longo (60 dias)** — uma vez, no terminal:

   ```
   curl -s "https://graph.instagram.com/access_token   ?grant_type=ig_exchange_token   &client_secret=SEU_APP_SECRET   &access_token=TOKEN_CURTO"
   ```

   ⚠️ O **App Secret** é usado só aqui, no terminal, uma vez. Ele **não** entra
   nas variáveis do site: o código nunca o lê, e um segredo guardado sem
   consumidor é superfície de vazamento sem contrapartida.

6. **Pegue o ID da conta** com o token longo:

   ```
   curl -s "https://graph.instagram.com/v25.0/me?fields=id,username   &access_token=TOKEN_LONGO"
   ```

### Variáveis na Vercel

*Settings → Environments → Production*. **Nenhuma leva `NEXT_PUBLIC_`** — esse
prefixo embute o valor no pacote que vai para o navegador, e um token de leitura
publicado é um token vazado.

| Variável | Valor |
| --- | --- |
| `INSTAGRAM_ACCESS_TOKEN` | o token longo do passo 5 |
| `INSTAGRAM_USER_ID` | o `id` do passo 6 |
| `INSTAGRAM_API_VERSION` | `v25.0` (opcional — é o padrão) |
| `INSTAGRAM_POST_LIMIT` | `4` (opcional — é o padrão) |

Depois de salvar, **refaça o deploy**: variável nova não entra num build já
feito.

### ⚠️ O token expira em 60 dias

Este é o modo de falhar que morde meses depois, quando ninguém lembra da
integração: o feed some sozinho e o site continua verde em tudo que se mede.

Renove com o próprio token, sem App Secret e sem refazer o login:

```
curl -s "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=TOKEN_ATUAL"
```

O token só pode ser renovado **depois de 24 horas de vida** e **antes de
expirar**. Se expirar, é refazer os passos 4 a 6.

**Ponha um lembrete no calendário para 50 dias.** É a única proteção que existe
hoje: não há renovação automática, e o site não avisa.

### Conferir se funcionou

Sem rota de diagnóstico neste projeto — a verificação é a própria home:

1. Abra a home publicada e role até depois da galeria. Quatro quadrados devem
   aparecer, com o botão "Seguir no Instagram" embaixo.
2. Se a seção **não** aparecer, o motivo está nos *Runtime Logs* da Vercel: as
   linhas começam com `[instagram]` e dizem a causa **sem expor o token**.
   Código `190` é token inválido ou expirado; `4` e `17` são limite de
   requisições.
3. O feed fica em cache de dez minutos. Depois de trocar o token, espere esse
   tempo ou refaça o deploy.

### Conferir o layout sem credenciais

```
INSTAGRAM_PREVIEW=true npm run dev
```

Desenha quadros vazios no lugar dos posts, só fora de produção. Serve para
validar espaçamento e responsividade enquanto as credenciais não chegam.

---

## CSP (pending)

Content-Security-Policy is **not** set yet. Adding it requires a nonce middleware
(inline JSON-LD + Next hydration scripts) and per-page testing — treat as its own
task. See ADR-0004 and `security-review`.
