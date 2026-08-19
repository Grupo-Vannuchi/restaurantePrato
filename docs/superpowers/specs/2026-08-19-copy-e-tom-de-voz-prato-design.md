# Spec — Copy, tom de voz e dados de operação do Restaurante Prato

> PR 3 da sequência do rebrand. O PR 1 (dados do cliente, marca tipográfica
> interina, copy neutralizada) está fechado; o PR 2 (paleta e logo) continua
> travado esperando a identidade visual.
>
> Fonte: `CopysiteInstitucionalRestaurantePrato.md`, entregue pelo cliente em
> 19/08/2026.

## 1. Objetivo

A copy que está no ar hoje é **interina e deliberadamente genérica** — o PR 1 a
esvaziou para não herdar afirmações do cliente anterior. Ela é verdadeira, mas
não vende nada e não diz o que o Prato é.

Este spec troca essa copy pelo texto definitivo do cliente, aplica o tom de voz
que o documento define e publica três dados de operação que o documento destrava
e que estavam bloqueando structured data e SEO local.

**Não é um redesenho.** A estrutura do fork permanece intacta: nenhuma rota nova,
nenhuma mudança de schema, nenhuma migration. A única seção nova é o fechamento
de `/gastronomia` (§5.3.1), que religa duas chaves que já existem no catálogo e
hoje não aparecem em lugar nenhum.

## 2. O que o documento destrava

| Pendência (era `«PENDENTE»`) | Valor confirmado |
|---|---|
| Horário de funcionamento | Segunda a sexta, das 11h às 15h |
| Instagram | `@restaurante.prato` |
| Tipo de cozinha | Brasileira, churrasco |
| Copy definitiva | Todas as páginas públicas |

Continuam pendentes, e este spec **não os toca**: paleta, logo, fotos do hero e
da galeria, cardápio (entra pelo admin), razão social do domínio final e
`SITE_INDEXABLE`.

## 3. Conflitos entre o documento e o dado confirmado

O documento não é uma fonte limpa: ele contradiz dados confirmados em 17/08 e
carrega vestígios do posicionamento do cliente anterior. Cada conflito foi
decidido com o dono do projeto em 19/08.

### 3.1 Endereço — número 09 vs. 25 · **NÃO RESOLVIDO**

O documento escreve "Rua Augusto Severo, 09" duas vezes (rodapé §2.7 e contato
§6). O dado confirmado em 17/08, coerente com o CNPJ e com o CEP 11010-050, é o
número **25**, e é o que está em `src/config/site.ts` e `src/content/legal.ts`.

**Decisão:** mantém 25 e **nenhuma task deste spec toca endereço**. O cliente vai
confirmar. Escolher entre os dois seria inventar dado — e o número errado quebra
o mapa, o `PostalAddress` do JSON-LD e o endereço nos documentos de LGPD ao mesmo
tempo.

### 3.2 "Centro Histórico" vs. "Centro"

O documento diz "Centro Histórico de Santos". Todo o dado confirmado e toda a
copy atual dizem "Centro de Santos" — e "Centro Histórico" era exatamente o
posicionamento do restaurante do qual este repo é fork.

**Decisão:** "Centro de Santos" em todo lugar. Não é só higiene de fork: é como
as pessoas buscam.

### 3.3 A cafeteria some da copy

A razão social é PRATO COFFEE SHOP REFEIÇÕES e o dado confirmado descreve
"restaurante **e** cafeteria". O documento de copy não menciona café uma única
vez — é integralmente buffet, churrasco e almoço executivo.

**Decisão:** "cafeteria" sai da copy do site (metadata, rodapé, `llms.txt`,
`/experiencia`). A razão social continua em `src/content/legal.ts`, porque lá é
registro, não posicionamento.

Se a cafeteria voltar a ser um argumento comercial, ela precisa de dado próprio
(o que serve, em que horário) antes de virar texto.

### 3.4 Reservas vs. buffet de alta rotatividade

O menu proposto pelo documento é `[INÍCIO] [A EXPERIÊNCIA] [NOSSA GASTRONOMIA]
[HORÁRIOS] [CONTATO]` — sem reservas — e todos os CTAs viram "ver o cardápio" e
"como chegar". Mas o dado confirmado diz que o Prato aceita reserva, e hoje o
site inteiro converte em "reserve a sua mesa" pelo WhatsApp.

**Decisão — reconciliação:** a rota `/reservas` e `acceptsReservations: true`
permanecem, mas a página passa a **liderar com horário**:

- o rótulo de nav vira "Horários" (era "Horários & Reservas");
- o H1 e o subtítulo passam a ser o horário e o gatilho das 11h;
- a reserva sobrevive na seção "Reservas para grupos e eventos", que **já existe**
  na página, e continua sendo o destino do `ReserveButton`.

Isso honra o documento sem apagar um fato confirmado nem destruir o único
mecanismo de conversão do site.

> A rota continua `/reservas`. Renomear rota é **três edições acopladas**
> (`NavKey`, chaves `nav` no `pt.json`, pastas em `(marketing)/`) por zero
> mudança visível — a mesma decisão já tomada para `/admin/testimonials`.

### 3.5 Emoji — fora

O guia de tom de voz do documento diz que emoji é "liberado e recomendado", e a
copy entregue vem com emoji em quase todo bullet.

**Decisão: nenhum emoji na copy.** Verificado em 19/08 que o site do qual este
repo é fork nunca usou emoji: zero ocorrências no `pt.json` atual e nas duas
versões anteriores do catálogo (`31c2885`, `23b5acf`), e zero em `src/` fora de
`⚠` em comentário de código e `©` no rodapé. O único emoji real do projeto está
em `src/lib/lead-notify.ts`, na mensagem de WhatsApp que **o restaurante recebe**
quando chega um lead — não é copy do site e não muda.

O tom de voz do documento entra como **vocabulário e ritmo**, não como emoji.

### 3.6 A fundação de 1998 continua liderando

O documento nunca usa tradição — o argumento dele é agilidade e fartura. A copy
atual apoia em `{years} anos no Centro de Santos` no eyebrow do hero e no
`/experiencia`.

**Decisão:** o eyebrow dos 27 anos **fica onde está**. A copy do documento entra
abaixo dele. `foundedYear` continua alimentando `foundingDate` no schema.

### 3.7 O documento veio com OCR corrompido

O arquivo entregue está com mojibake extenso: `almogo` (almoço), `Fungao`
(Função), `saldo` (salão), `refeiÂ¢do` (refeição), `guarnigdes` (guarnições).
A copy final é **reconstrução interpretada**, não transcrição.

Consequência: o texto do §5 deste spec precisa de revisão humana antes do merge.

## 4. Tom de voz

Destilado do §1 do documento, sem os emojis.

**Quem lê:** trabalhadores, bancários, lojistas e profissionais que atuam no
Centro de Santos. Gente com pouco tempo de almoço que não abre mão de comida de
verdade, farta e quente.

**Como falamos:** ágil, direto e convidativo. Frases curtas e escaneáveis. A
comida é descrita pelo desejo sensorial — fumaça, brasa, tempero caseiro,
casquinha dourada. A voz é de anfitrião popular e acolhedor.

**O que não fazemos:**

- vocabulário de alta gastronomia ("experiência irretocável", "à altura do seu
  status executivo");
- superlativo não verificável ("o ÚNICO restaurante com churrasco");
- palavra difícil, requintada ou esnobe;
- falar de delivery — o foco é o salão;
- emoji (§3.5).

## 5. Mapeamento da copy

Todo o texto abaixo vive em `src/messages/pt.json`. As chaves marcadas **novo**
não existem hoje; as marcadas **acoplado** exigem uma edição de código junto.

### 5.1 Home

Os cinco slots que já existem absorvem cinco blocos do documento. Nenhuma seção
nova.

| Chave | Texto |
|---|---|
| `home.hero.eyebrow` | `{years} anos no Centro de Santos` *(inalterado)* |
| `home.hero.slides[0].title` | A sua melhor e mais saborosa pausa do dia. |
| `home.hero.slides[0].subtitle` | Um buffet completo, sempre quentinho, com aquele tempero caseiro inconfundível — e o autêntico churrasco na brasa, fatiado na hora, para recarregar a energia pro expediente. |
| `home.hero.primaryCta` | Ver o cardápio **(acoplado)** |
| `home.hero.secondaryCta` | Como chegar *(inalterado)* |
| `home.gastronomia.eyebrow` | Nossa comida |
| `home.gastronomia.title` | Fartura, sabor e agilidade pro seu dia a dia. |
| `home.gastronomia.subtitle` | Sua pausa é sagrada. Por isso o buffet é completo, fresquinho e com bastante proteína — o almoço de responsa no Centro, sem frescura e com muito sabor. |
| `home.galeria.eyebrow` | O nosso espaço |
| `home.galeria.title` | O restaurante do dia a dia. |
| `home.galeria.subtitle` | Sem formalidade, feito para quem trabalha duro no Centro. |
| `home.testimonials.eyebrow` | Avaliações do Google *(inalterado)* |
| `home.testimonials.title` | O que dizem por aqui *(inalterado)* |
| `home.testimonials.subtitle` | Quem experimenta, não troca. |
| `home.cta.title` | 11h da manhã: o buffet já está servido. |
| `home.cta.subtitle` | Gosta de almoçar mais cedo e com tranquilidade? A partir das 11h a comida já está montada, bem quente, com o churrasco saindo direto da brasa. |
| `home.cta.button` | Veja nossos horários |

**Acoplado — `home.hero.primaryCta`:** o CTA primário do hero aponta hoje para
`/experiencia`. Trocar o rótulo para "Ver o cardápio" exige trocar o `href` para
`/gastronomia` em `src/components/sections/hero-carousel.tsx`. Rótulo sem destino
correspondente é bug de navegação, não detalhe de copy.

**`home.cta.button` não precisa de edição de código.** `src/components/sections/cta.tsx`
já renderiza dois botões: um `Link href="/reservas"` rotulado por `t("button")` e,
ao lado, um `ReserveButton` separado para o WhatsApp. "Veja nossos horários" já
cai no destino certo, e a conversão por WhatsApp continua ao lado dele — exatamente
o arranjo que §3.4 pede.

### 5.2 `/experiencia`

O `PageHeader` desta página alimenta **o H1 e o `<title>` da metatag** ao mesmo
tempo. Por isso `title` continua "A Experiência" (é o que funciona em resultado de
busca) e o H1 do documento — "A sua pausa merecida no coração do Centro" — entra
como subtítulo.

| Chave | Texto |
|---|---|
| `experiencia.title` | A Experiência *(inalterado)* |
| `experiencia.subtitle` | A sua pausa merecida no coração do Centro. **(acoplado)** |
| `experiencia.metaDescription` | Buffet completo e churrasco na brasa no Centro de Santos, de segunda a sexta, das 11h às 15h. |
| `experiencia.lead` | Muito mais do que uma refeição rápida. O Prato foi pensado para quem valoriza o próprio tempo: ambiente dinâmico, alta rotatividade e nada de longas esperas. Comida de verdade, farta e sempre quente, para você recarregar as energias e voltar pontualmente ao expediente. No Centro de Santos desde {foundedYear}. |
| `experiencia.audience.title` | Quem experimenta, não troca. |
| `experiencia.audience.intro` | O que você encontra aqui todo dia: |
| `experiencia.contactCta.title` | Vem almoçar com a gente. |
| `experiencia.contactCta.paragraphs[0]` | O buffet está servido a partir das 11h, de segunda a sexta. Chegue cedo e aproveite o salão tranquilo. |
| `experiencia.disclaimer` | *(inalterado — endereço, §3.1)* |

`experiencia.audience.items` recebe os cinco cards de "A Pausa de Respeito"
(§2.4 do documento), que caem numa lista que já existe:

1. Churrasco na brasa — o barulho da carne chiando e aquela casquinha dourada. Os melhores cortes, todos os dias.
2. Buffet completo — variedade farta de saladas, pratos quentes e guarnições para montar o seu pratão.
3. Agilidade — pegou, serviu, comeu. O salão é preparado para você não perder um minuto da sua pausa.
4. Comida quente — bancada quente do início ao fim do expediente.
5. Ambiente acolhedor — o restaurante do dia a dia, sem formalidade, feito para quem trabalha duro no Centro.

> **Texto puro, sem formatação.** O componente `CheckList` desta página recebe
> `string[]` e renderiza como texto — diferente de `lead` e `audience.intro`, que
> passam por `t.rich(…, richTags)`. Um `**negrito**` ou uma tag rica dentro de um
> item apareceria literalmente na tela. A separação entre o rótulo e a frase é o
> travessão.

**Acoplado — `experiencia.subtitle`:** a página chama hoje
`t("subtitle", { foundedYear })`. Com o placeholder removido do texto, o
next-intl tipado passa a rejeitar a chamada com valores ("no values accepted"),
então `src/app/[locale]/(marketing)/experiencia/page.tsx` precisa passar a chamar
`t("subtitle")` sem argumentos. `experiencia.lead` **mantém** `{foundedYear}`, e
a chamada dele não muda.

### 5.3 `/gastronomia`

| Chave | Texto |
|---|---|
| `gastronomia.title` | Nossa Gastronomia *(inalterado)* |
| `gastronomia.subtitle` | Comida de verdade, churrasco na brasa e tempero caseiro. |
| `gastronomia.empty` | Em breve, o cardápio completo por aqui. |

**A página não tem CTA — e as chaves de CTA estão mortas.**
`gastronomia/page.tsx` renderiza `PageHeader` e, abaixo, as categorias do banco.
Não há seção de fechamento: `gastronomia.ctaTitle` e `gastronomia.ctaButton`
existem no catálogo mas **nenhum componente as consome** (verificado em 19/08,
§5.7). Escrever copy nelas seria texto que nunca aparece.

Consequência para o §4.3 do documento ("Qualidade, fartura e agilidade para a sua
pausa · Nosso buffet já está servido a partir das 11h"): ele **não tem onde
morar** hoje. Ver §5.3.1.

**Limitação assumida.** Os três blocos do §4.2 do documento (Churrasco
Autêntico · Comida com Sabor de Verdade · Buffet Farto e Ágil) também não têm
slot — a ideia dos três é destilada em `gastronomia.subtitle`, e a grade completa
fica registrada em §8.

### 5.3.1 A exceção aprovada: religar o CTA de `/gastronomia`

**Aprovada pelo dono do projeto em 19/08.** Esta é a **única** exceção à regra
"nenhuma seção nova" (§7), e ela custa pouco: as duas chaves já existem, o padrão
visual já existe (`Section` + `buttonVariants`, idêntico ao fechamento de
`/experiencia`), e hoje quem termina de ler o cardápio não tem passo seguinte
nenhum — nem horário, nem WhatsApp, nem "como chegar".

| Chave | Texto |
|---|---|
| `gastronomia.ctaTitle` | Qualidade, fartura e agilidade para a sua pausa. |
| `gastronomia.ctaSubtitle` | **novo** · O buffet já está servido a partir das 11h. Chegue cedo e aproveite. |
| `gastronomia.ctaButton` | Ver os horários |

O botão é um `Link href="/reservas"`, coerente com §3.4 — quem acabou de ler o
cardápio quer saber a que horas pode ir, não reservar mesa. A conversão por
WhatsApp continua no `WhatsappButton` flutuante do layout de marketing, presente
em toda página.

Com isso, `gastronomia.ctaTitle` e `gastronomia.ctaButton` **saem da lista de
chaves mortas** de §5.7 — passam a ser consumidas — e ganham
`gastronomia.ctaSubtitle` como vizinha nova.

### 5.4 `/reservas` — passa a se chamar "Horários"

| Chave | Texto |
|---|---|
| `nav.reservas` | Horários |
| `reservas.title` | Horários |
| `reservas.metaDescription` | Horário do Restaurante Prato, no Centro de Santos: de segunda a sexta, das 11h às 15h. |
| `reservas.subtitle` | De segunda a sexta, das 11h às 15h. |
| `reservas.practicalTitle` | Como está o salão |
| `reservas.hoursLabel` | **novo** · Horário |
| `reservas.salaoEarlyLabel` | **novo** · 11h |
| `reservas.salaoEarlyValue` | **novo** · Buffet intacto, comida recém-saída do fogo e muita tranquilidade. O paraíso de quem almoça cedo. |
| `reservas.salaoPeakLabel` | **novo** · Das 12h às 13h30 |
| `reservas.salaoPeakValue` | **novo** · O fluxo intenso do Centro. Mas fica tranquilo: a rotatividade é alta e a chapa não para. |
| `reservas.salaoLateLabel` | **novo** · A partir das 13h30 |
| `reservas.salaoLateValue` | **novo** · Clima mais calmo, ideal para comer sem pressa, com reposição garantida no buffet. |

*(Chaves planas, não um objeto `salao` aninhado: o namespace `reservas` já é todo
plano, e o `Fact` consome uma string por vez.)*
| `reservas.groupsTitle` | Reservas para grupos e eventos *(inalterado)* |
| `reservas.groupsCopy` | Vai trazer a equipe? Fale com a gente para acertar dia, horário e número de pessoas. |
| `reservas.addressLabel` | Endereço *(inalterado)* |

**Acoplado — a página.** `reservas/page.tsx` já importa o componente `Fact` e o
ícone `Clock` **sem usar** — o slot foi deixado pronto no PR 1 esperando o
horário. A implementação:

- publica o `Fact` de horário, que hoje degrada para um `<p className="sr-only">`;
- adiciona os três `Fact` de "Como está o salão" na grade `sm:grid-cols-2`, que
  hoje tem um item só;
- mantém a seção de grupos e o `ReserveButton` como estão (§3.4).

### 5.5 `/contato`

| Chave | Texto |
|---|---|
| `contact.title` | A poucos passos de você no Centro |
| `contact.subtitle` | *(inalterado — endereço, §3.1)* |
| `contact.labels.instagram` | **novo** · Instagram |
| `contact.form.messagePlaceholder` | Conte o que você precisa — grupo, evento, dúvida… |

### 5.6 Metadata, rodapé e `llms.txt`

| Chave | Texto |
|---|---|
| `metadata.defaultTitle` | `{brand}` \| Almoço, buffet e churrasco no Centro de Santos |
| `metadata.description` | Buffet completo e churrasco na brasa no Centro de Santos, na R. Augusto Severo, 25. De segunda a sexta, das 11h às 15h. Desde 1998. |
| `metadata.keywords` | almoço centro de santos, buffet centro de santos, churrasco centro de santos, restaurante centro de santos, onde almoçar no centro de santos |
| `footer.tagline` | A sua melhor e mais saborosa pausa do dia. |

> **`metadata.description` cita o endereço.** O "R. Augusto Severo, 25" já está
> na descrição atual e é **preservado, não alterado** — §3.1 continua valendo. Mas
> isso cria um quarto lugar acoplado ao número: se o cliente responder "09", mudam
> `src/config/site.ts`, `src/content/legal.ts`, `metadata.description` e
> `experiencia.disclaimer` juntos.

**"Cafeteria" está hardcoded em quatro arquivos fora do catálogo** (levantado em
19/08). Todos perdem "e cafeteria" por §3.3:

| Arquivo | Linha |
|---|---|
| `src/app/llms.txt/route.ts` | 48 |
| `src/app/llms-full.txt/route.ts` | 80 |
| `src/app/manifest.ts` | 8 |
| `src/app/[locale]/opengraph-image.tsx` | 45 |

`src/app/llms.txt/route.ts` tem ainda uma segunda string a mudar: o link
`line("Horários & Reservas", "/reservas", "Reservas e informações práticas")`
vira `line("Horários", "/reservas", "Horário de funcionamento e informações
práticas")` (§3.4).

### 5.7 Chaves mortas encontradas na varredura

Varrendo as 382 chaves folha do catálogo contra `src/` em 19/08, dez não são
consumidas por nenhum componente:

| Chave | Destino |
|---|---|
| `common.learnMore` | apagar |
| `common.backHome` | apagar |
| `galeria.ctaTitle` · `galeria.ctaButton` | apagar |
| `gastronomia.viewAll` · `novidades.viewAll` | apagar |
| `novidades.menuTitle` | apagar |
| `admin.leads.receivedAt` | apagar — a tabela formata `lead.createdAt` direto |
| `gastronomia.ctaTitle` · `gastronomia.ctaButton` | **manter** — religadas em §5.3.1 |

As duas `viewAll` de namespace são invisíveis para uma varredura por último
segmento, porque `common.viewAllMenu` e `common.viewAllGallery` — essas sim
vivas, em `menu-preview.tsx:32` e `gallery-preview.tsx:31` — contêm a mesma
substring. Confirmadas mortas por busca direta.

**Oito chaves saem do catálogo.** O `pt.json` é o arquivo que já regrediu duas vezes neste
repositório — a segunda derrubando o deploy, a CI e o E2E ao mesmo tempo — e é
justamente por isso que existe o hook de `pre-push`. Chave morta num catálogo
desse tamanho é ruído que esconde a próxima regressão.

> **Não apagar `admin.whatsapp.state_connecting` e `state_close`.** A varredura
> automática as marca como mortas, mas elas são montadas dinamicamente em
> `src/components/admin/whatsapp-manager.tsx` com
> ``t(`state_${state}` as "state_open")``. Falso positivo — apagá-las quebraria o
> painel do WhatsApp em runtime, sem erro de tipo.

## 6. Dados de operação

### 6.1 Horário — e o bug que ele revela

```ts
openingHours: {
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  opens: "11:00",
  closes: "15:00",
},
```

Publicar isso preenche sozinho, sem mais nenhuma edição:
`openingHoursSpecification` no `Restaurant` JSON-LD, a linha de horário do
`/llms.txt` e o horário na imagem OG.

**Mas dois desses consumidores estão errados.** `src/app/llms.txt/route.ts` e
`src/app/[locale]/opengraph-image.tsx` montam a string a partir de `opens` e
`closes` **ignorando `days`**, produzindo "Aberto das 11h às 15h". Enquanto
`openingHours` estava omitido a string saía vazia e o defeito ficava latente; ao
publicar o horário, ele passa a afirmar que o restaurante abre todo dia — e
manda gente para a porta fechada no sábado.

**Corrigir junto, na mesma task:** os dois passam a derivar o intervalo de dias
de `days` e a renderizar "Seg a sex, das 11h às 15h". O JSON-LD já está correto —
ele emite `dayOfWeek` verbatim.

### 6.2 Instagram

```ts
social: { instagram: "https://instagram.com/restaurante.prato" },
```

O rodapé já itera `siteConfig.social` genericamente e o `sameAs` do JSON-LD já
lê o mesmo objeto — nenhum dos dois precisa de edição. `/contato` ganha a linha
nova (§5.5).

**Verificar antes de publicar** que o perfil existe com esse handle exato. Um
`sameAs` apontando para perfil inexistente é sinal ruim de entidade.

### 6.3 Tipo de cozinha

```ts
servesCuisine: ["Brasileira", "Churrasco"],
```

"Buffet" fica de fora de propósito: é modelo de serviço, não cozinha, e
`servesCuisine` alimenta o `Restaurant` no grafo.

## 7. O que este spec deliberadamente não faz

- **Não toca endereço** (§3.1) — aguarda o cliente.
- **Não cria seção nova, com uma exceção declarada.** As seções do documento sem
  slot correspondente (faixa de destaques, teaser com foto, grade da Pausa de
  Respeito na home, grade de blocos em `/gastronomia`) foram absorvidas pelos
  slots existentes ou registradas em §8. A única exceção é o fechamento de
  `/gastronomia` (§5.3.1), que religa duas chaves que já existem — aprovada
  pelo dono do projeto em 19/08.
- **Não mexe em paleta nem em logo** — é o PR 2, e continua travado.
- **Não escreve depoimento.** Os três depoimentos do §2.5 do documento precisam
  ser avaliações reais do Google, com `source` e `sourceUrl`, cadastradas pelo
  admin. Inventar depoimento é proibido; e depoimento nunca entra em structured
  data, sob risco de perder o rich result por *self-serving review*.
- **Não cadastra cardápio nem foto.** Entram pelo admin.
- **Não mexe em `SITE_INDEXABLE`.** Continua `false` enquanto houver `«PENDENTE»`
  em `src/content/legal.ts`.
- **Não introduz preço.** A pergunta §4.1 do spec do rebrand continua aberta.

## 8. Trabalho futuro registrado

1. **Grade de blocos em `/gastronomia`** — os três blocos do §4.2 do documento
   (Churrasco Autêntico · Sabor de Verdade · Buffet Farto e Ágil), com foto.
   Precisa de componente novo e das fotos.
2. **Faixa de destaques e teaser na home** — §2.2 e §2.3 do documento como
   seções próprias, em vez de absorvidas pelo `MenuPreview`.
3. **Reabrir o lado cafeteria** se o cliente trouxer dado (§3.3).

## 9. Critérios de aceite

1. `npm run typecheck && npm run lint && npm run build` passam.
2. `npm test` passa — incluindo `test/brand-hygiene.test.ts`, que não pode
   ganhar nenhum vestígio novo. A copy não introduz "Centro Histórico" (§3.2).
3. Nenhum emoji em `src/messages/pt.json` nem em componente de seção (§3.5).
4. O endereço em `site.ts` e em `legal.ts` continua exatamente como está (§3.1).
5. `/llms.txt` e a imagem OG dizem "Seg a sex, das 11h às 15h" — com os dias
   (§6.1).
6. O `Restaurant` JSON-LD passa no Rich Results Test com
   `openingHoursSpecification`, `servesCuisine` e `sameAs` presentes, e continua
   sem `Review` e sem `aggregateRating`.
7. `acceptsReservations` continua `true` e o `ReserveButton` continua funcional
   na seção de grupos de `/reservas` (§3.4).
8. Nenhuma rota renomeada e nenhuma migration. Nenhum componente de seção novo —
   exceto o fechamento de `/gastronomia` (§5.3.1), aprovado em 19/08.
9. As oito chaves mortas de §5.7 saíram do catálogo, e
   `admin.whatsapp.state_connecting` / `state_close` **continuam lá**. Verificar
   o painel de WhatsApp do admin depois da limpeza.
