# PR 1 — O repo deixa de ser o Fogão de Ouro

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover toda informação do Fogão de Ouro do site e preencher os dados do
Restaurante Prato já confirmados, deixando marcado o que ainda não chegou.

**Architecture:** O repositório é um fork do site pronto do Fogão de Ouro. A
estrutura de restaurante (rotas, cardápio, galeria, reservas por WhatsApp, schema
`Restaurant`, PT-only) é exatamente o que o cliente quer reaproveitar e **não muda**.
O trabalho é re-skin: três campos de config viram opcionais para poder degradar sem
dado (Tasks 1–3), os dados do cliente entram (Task 4), a marca visual vira
tipográfica até a logo chegar (Task 5), a copy herdada é neutralizada (Task 6) e a
documentação passa a descrever o Prato (Task 7). Uma guarda de regressão em Vitest
cresce a cada task e trava o retorno de qualquer string do cliente anterior.

**Tech Stack:** Next 16 (Turbopack) · React 19 + React Compiler · next-intl (pt
apenas) · Prisma 6 + Supabase · Tailwind v4 · Vitest + Playwright.

**Spec:** [`2026-08-17-whitelabel-restaurante-prato-design.md`](../specs/2026-08-17-whitelabel-restaurante-prato-design.md)

## Global Constraints

- **Branch:** `Development`. Não commitar em `main`; o `git push` é manual, feito
  pelo dono do projeto.
- **Validar antes de declarar pronto:** `npm run typecheck && npm run lint && npm run test`.
  ⚠️ `npm run build` **não roda neste checkout**: não existe `.env` (só `.env.example`),
  e o build falha na validação de ambiente por falta de `DATABASE_URL`/Supabase —
  nada a ver com o código. A validação de build acontece no CI e no deploy.
- ⚠️ **O Vitest não checa tipos.** Ele transpila com esbuild, então um teste que só
  quebraria no tipo passa verde. Onde o RED de uma task é uma mudança de tipo, o
  comando que produz o vermelho é `npm run typecheck`, não `npx vitest run`.
- **Português apenas.** Toda string de UI vive em `src/messages/pt.json`. Não existe
  `en.json` e não se cria um.
- **Nunca inventar dado do cliente.** Substituir só quando existe fato confirmado;
  remover quando não existe. Nunca aproximar.
- **Fatos confirmados do Restaurante Prato** (únicos valores autorizados):
  - nome fantasia: `Restaurante Prato`
  - razão social: `PRATO COFFEE SHOP REFEICOES LTDA`
  - CNPJ: `03.354.096/0001-84`
  - endereço: `R. Augusto Severo, 25 — Centro`, `Santos`, `SP`, `Brasil`, CEP `11010-050`
  - e-mail: `pratocoffee@gmail.com`
  - WhatsApp: `5513978208568`, exibido `+55 (13) 97820-8568`
  - fundação: `1998`
  - natureza: restaurante **e** cafeteria; **aceita reserva**
- **Sem telefone fixo, sem horário, sem tipo de cozinha, sem logo, sem paleta, sem
  fotos.** Degradar, nunca herdar o valor do Fogão de Ouro.
- **Não mexer** em `SITE_INDEXABLE` (segue `false`), nas rotas, no `NavKey`, nos
  models do Prisma nem na paleta. Paleta e logo são o PR 2; copy e horário são o PR 3.
- Commits convencionais, terminando com
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

### Task 1: `contact.phone` vira opcional

O Prato não tem telefone fixo. O campo é obrigatório hoje e aparece em seis lugares.
Segue o padrão que o projeto já usa em `whatsappLink()`: sem valor, a interface omite.

**Files:**
- Modify: `src/config/site.ts` (tipo `SiteConfig`, `phoneLink()`)
- Modify: `src/app/[locale]/(marketing)/contato/page.tsx:46`
- Modify: `src/app/[locale]/(marketing)/reservas/page.tsx:118-121`
- Modify: `src/components/layout/footer.tsx:63-65`
- Modify: `src/components/reserve-button.tsx:35-42`
- Modify: `src/components/json-ld.tsx:59`
- Test: `test/site-config.test.ts` (criar)

**Interfaces:**
- Consumes: nada de tasks anteriores.
- Produces: `phoneLink(): string | null` e `siteConfig.contact.phone?: string`.
  As Tasks 2 e 4 dependem dessa assinatura.

- [x] **Step 1: Criar a branch de trabalho**

```bash
git checkout -b Development
git status
```

Esperado: `On branch Development`, com o spec e este plano como untracked.

- [x] **Step 2: Escrever o teste que falha**

Criar `test/site-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { phoneLink, siteConfig } from "@/config/site";

describe("phoneLink", () => {
  it("devolve null quando não há telefone configurado", () => {
    // O Prato não tem telefone fixo: o site precisa omitir os CTAs de ligar
    // em vez de gerar um `tel:` vazio.
    if (siteConfig.contact.phone) {
      expect(phoneLink()).toBe(
        `tel:${siteConfig.contact.phone.replace(/[^\d+]/g, "")}`,
      );
    } else {
      expect(phoneLink()).toBeNull();
    }
  });
});
```

- [x] **Step 3: Rodar e ver falhar**

Run: `npx vitest run test/site-config.test.ts`
Esperado: FAIL — `phoneLink()` tem retorno `string`, então o `toBeNull()` não
typecheca e o Vitest acusa erro de tipo/asserção.

- [x] **Step 4: Tornar o campo opcional em `src/config/site.ts`**

No tipo `SiteConfig`, trocar a linha do telefone:

```ts
  contact: {
    email: string;
    /**
     * Telefone em forma legível. Opcional: o restaurante pode não ter linha
     * fixa, e nesse caso cada CTA de ligar some em vez de gerar um `tel:` vazio.
     */
    phone?: string;
```

E a função:

```ts
/**
 * Um href `tel:` a partir do telefone legível, ou `null` quando não há telefone
 * configurado. Os chamadores precisam tratar o null — mesmo contrato de
 * `whatsappLink()`.
 */
export function phoneLink(): string | null {
  const { phone } = siteConfig.contact;
  if (!phone) return null;
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
```

- [x] **Step 5: Ajustar `contato/page.tsx`**

O canal "Telefone" passa a ser condicional, do mesmo jeito que o de WhatsApp já é.
Substituir a linha 46:

```tsx
    { icon: Mail, label: t("labels.email"), value: contact.email, href: `mailto:${contact.email}` },
    // Só listado quando existe telefone — mesmo contrato do WhatsApp abaixo.
    ...(contact.phone
      ? [
          {
            icon: Phone,
            label: t("labels.phone"),
            value: contact.phone,
            href: phoneLink() ?? undefined,
          },
        ]
      : []),
```

- [x] **Step 6: Ajustar `reservas/page.tsx`**

O parágrafo `sr-only` juntava horário e telefone. Substituir o bloco das linhas
118–121:

```tsx
        {contact.phone ? (
          <p className="sr-only">
            {`${openingHours.opens}–${openingHours.closes} · ${contact.phone}`}
          </p>
        ) : null}
```

*(A Task 2 volta aqui para tratar o `openingHours`.)*

- [x] **Step 7: Ajustar `footer.tsx`**

Substituir o `<span>` das linhas 63–65:

```tsx
          {siteConfig.contact.phone ? (
            <span className="text-sm text-muted-foreground">
              {siteConfig.contact.phone}
            </span>
          ) : null}
```

- [x] **Step 8: Ajustar `reserve-button.tsx`**

O fallback para `tel:` só faz sentido se existir telefone. Substituir o bloco das
linhas 35–42:

```tsx
  const tel = phoneLink();
  const { phone } = siteConfig.contact;

  if (!href) {
    // Sem WhatsApp e sem telefone não há canal nenhum para abrir — melhor não
    // renderizar botão do que renderizar um link morto.
    if (!tel || !phone) return null;
    return (
      <a href={tel} className={buttonVariants({ variant, size, className })}>
        <Phone className="size-5" />
        {t("callUs", { phone })}
      </a>
    );
  }
```

Os dois testes (`!tel || !phone`) andam juntos, mas o TypeScript não liga um ao
outro sozinho — checar os dois evita uma asserção `!` só para calar o compilador.

E atualizar o comentário do topo do componente (linhas 13–15):

```tsx
 * Enquanto não houver número de WhatsApp configurado ele degrada para um link
 * `tel:`; se também não houver telefone, não renderiza nada — em vez de exibir
 * um botão que não leva a lugar nenhum.
```

- [x] **Step 9: Ajustar `json-ld.tsx`**

`telephone` só entra no grafo quando existe. Substituir a linha 59:

```tsx
    ...(contact.phone && { telephone: contact.phone }),
```

- [x] **Step 10: Rodar tudo**

Run: `npm run typecheck && npx vitest run test/site-config.test.ts && npm run lint`
Esperado: typecheck sem erros; 1 teste passando; lint limpo.

- [x] **Step 11: Commit**

Os caminhos de rota têm `[locale]` e `(marketing)`, que o shell expande como glob e
subshell — usar `git add src test` em vez de citar arquivo por arquivo.

```bash
git add src test
git commit -m "$(cat <<'EOF'
UPD: telefone vira opcional para o site poder degradar sem linha fixa

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `openingHours` vira opcional

O horário do Prato ainda não veio. Sem isso, exibir o horário herdado manda o
visitante para a porta fechada — e o `openingHoursSpecification` do schema.org
levaria o erro para dentro da busca do Google.

**Files:**
- Modify: `src/config/site.ts` (tipo `SiteConfig`)
- Modify: `src/components/json-ld.tsx:38-81`
- Modify: `src/app/llms.txt/route.ts:53-57`
- Modify: `src/app/[locale]/(marketing)/reservas/page.tsx`
- Test: `test/site-config.test.ts` (estender)

**Interfaces:**
- Consumes: `phoneLink(): string | null` da Task 1.
- Produces: `siteConfig.openingHours?: OpeningHours`. A Task 4 depende disso para
  poder omitir o campo em vez de herdar o valor do cliente anterior.

- [x] **Step 1: Escrever o teste que falha**

Acrescentar a `test/site-config.test.ts` (e ao import do topo, `type SiteConfig`):

```ts
describe("horário de funcionamento", () => {
  it("o tipo aceita um restaurante sem horário conhecido", () => {
    // Enquanto o horário do Prato não chega, a config precisa poder omiti-lo —
    // exibir o horário herdado mandaria o visitante para a porta fechada.
    const semHorario: SiteConfig = { ...siteConfig, openingHours: undefined };
    expect(semHorario.openingHours).toBeUndefined();
  });
});
```

- [x] **Step 2: Rodar e ver falhar**

⚠️ **O RED aqui é o `typecheck`, não o Vitest.** O Vitest transpila com esbuild e
**não** checa tipos, então um teste que só quebra no tipo passa verde. Isto foi
descoberto na Task 1, onde o RED previsto não reproduzia.

Run: `npm run typecheck`
Esperado: FAIL — `Type 'undefined' is not assignable to type 'OpeningHours'` em
`test/site-config.test.ts`, mais os erros nos consumidores de `openingHours`
(`json-ld.tsx`, `llms.txt/route.ts`, `reservas/page.tsx`) assim que o campo virar
opcional no Step 3. O GREEN é o mesmo comando limpo, depois dos Steps 3–6.

- [x] **Step 3: Tornar opcional em `src/config/site.ts`**

```ts
  /**
   * Quando o restaurante serve. Alimenta a copy e o SEO local. Opcional: sem o
   * horário real, o site omite — exibir horário errado manda o visitante para a
   * porta fechada e leva o erro para dentro do resultado de busca.
   */
  openingHours?: OpeningHours;
```

- [x] **Step 4: Ajustar `json-ld.tsx`**

Substituir o bloco `openingHoursSpecification` (linhas 74–81):

```tsx
    ...(openingHours && {
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: openingHours.days,
          opens: openingHours.opens,
          closes: openingHours.closes,
        },
      ],
    }),
```

- [x] **Step 5: Ajustar `llms.txt/route.ts`**

Substituir as linhas 53–57:

```ts
  const { openingHours } = siteConfig;
  const hours = openingHours
    ? ` Aberto das ${openingHours.opens.replace(":00", "h")} às ${openingHours.closes.replace(":00", "h")}.`
    : "";
  const sections = [
    `# ${name}`,
    "",
    `> Restaurante e cafeteria no Centro de Santos — ${fullAddress()}.${hours}`,
```

- [x] **Step 6: Ajustar `reservas/page.tsx`**

O `sr-only` (já condicional ao telefone pela Task 1) passa a depender também do
horário. Substituir o bloco:

```tsx
        {openingHours ? (
          <p className="sr-only">
            {`${openingHours.opens}–${openingHours.closes}`}
          </p>
        ) : null}
```

E o `Fact` de horário (linha ~117) passa a ser condicional:

```tsx
          {openingHours ? (
            <Fact icon={Clock} label={t("hoursLabel")} value={hours} />
          ) : null}
```

- [x] **Step 7: Rodar e ver passar**

Run: `npm run typecheck && npx vitest run test/site-config.test.ts`
Esperado: typecheck limpo; 2 testes passando.

- [x] **Step 8: Commit**

```bash
git add src test
git commit -m "$(cat <<'EOF'
UPD: horario de funcionamento vira opcional e o site omite quando nao ha dado

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `servesCuisine` deixa de ser emitido vazio

O tipo de cozinha do Prato não veio. Um array vazio no `Restaurant` é ruído no grafo.

**Files:**
- Modify: `src/config/site.ts` (tipo `SiteConfig`)
- Modify: `src/components/json-ld.tsx:61`

**Interfaces:**
- Consumes: nada.
- Produces: `siteConfig.servesCuisine?: string[]`.

- [x] **Step 1: Tornar opcional em `src/config/site.ts`**

```ts
  /**
   * Tipos de cozinha para `Restaurant.servesCuisine`. Opcional enquanto o
   * cardápio do cliente não chega.
   *
   * Nota: não existe `priceRange` porque a direção visual do cliente **anterior**
   * proibia publicar preço. Ver a pergunta aberta §4.1 do spec do rebrand: se o
   * Prato quiser exibir preço, isso volta à mesa.
   */
  servesCuisine?: string[];
```

- [x] **Step 2: Ajustar `json-ld.tsx`**

Substituir a linha 61 (`servesCuisine,`):

```tsx
    ...(servesCuisine?.length ? { servesCuisine } : {}),
```

Ternário, e não `&&` como nas outras linhas do arquivo: o valor falso aqui é o
número `0`, e espalhar um número em literal de objeto é erro de tipo. Onde o valor
falso é `undefined` (como em `legalName`), o `&&` da casa continua válido.

- [x] **Step 3: Rodar**

Run: `npm run typecheck && npm run lint`
Esperado: ambos limpos.

- [x] **Step 4: Commit**

```bash
git add src/config/site.ts src/components/json-ld.tsx
git commit -m "$(cat <<'EOF'
UPD: servesCuisine sai do schema quando nao ha tipo de cozinha definido

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Os dados do Restaurante Prato entram

Primeira task que troca dado de cliente. Introduz a guarda de regressão, que cresce
nas tasks seguintes.

**Files:**
- Create: `test/brand-hygiene.test.ts`
- Modify: `src/config/site.ts:130-207` (o objeto `siteConfig`)
- Modify: `src/content/legal.ts:1-40` (cabeçalho e `legalEntity`)
- Modify: `src/i18n/routing.ts:9-11` (comentário)

**Interfaces:**
- Consumes: `phone?`, `openingHours?` e `servesCuisine?` das Tasks 1–3.
- Produces: o arquivo `test/brand-hygiene.test.ts`, com a função local
  `offenders(targets: string[]): string[]` e um único `describe`. As Tasks 5, 6 e 7
  acrescentam blocos `it()` dentro desse mesmo `describe` e reutilizam `offenders`
  — a função não é exportada.

- [x] **Step 1: Escrever a guarda que falha**

Criar `test/brand-hygiene.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guarda de regressão do rebrand Fogão de Ouro → Restaurante Prato.
 *
 * Este repositório é um fork do site pronto do Fogão de Ouro, e a copy herdada
 * afirmava fatos daquele restaurante sem citar a marca ("180 lugares", "por
 * quilo", "Bolsa do Café"). Um grep pelo nome da marca não pega isso — daí a
 * lista abaixo.
 *
 * `docs/` NÃO é varrido de propósito: os specs e planos do rebrand anterior
 * ficam no repo justamente por explicarem por que o código tem a forma que tem,
 * e este spec cita a marca antiga em cada seção.
 */
const FORBIDDEN = [
  "Fogão de Ouro",
  "Fogao de Ouro",
  "fogaodeouro",
  "fgdeouro",
  "Frei Gaspar",
  "Bolsa do Café",
  "Museu do Café",
  "180 lugares",
  "1.200 avaliações",
  "por quilo",
  "por Quilo",
  "11010-090",
  "3219-1552",
  "99163-2985",
  "04.160.109",
];

const TEXT_EXT = new Set([".ts", ".tsx", ".json", ".css", ".mjs", ".md", ".txt"]);

/** Todos os arquivos de texto sob um caminho, que pode ser arquivo ou pasta. */
function walk(target: string): string[] {
  const full = join(process.cwd(), target);
  if (statSync(full).isFile()) {
    return TEXT_EXT.has(extname(full)) ? [full] : [];
  }
  return readdirSync(full).flatMap((entry) => walk(join(target, entry)));
}

/** `caminho: termo` para cada vestígio encontrado. */
function offenders(targets: string[]): string[] {
  return targets.flatMap(walk).flatMap((file) => {
    const text = readFileSync(file, "utf8");
    return FORBIDDEN.filter((term) => text.includes(term)).map(
      (term) => `${file.replace(process.cwd(), "")}: ${term}`,
    );
  });
}

describe("nenhum vestígio do cliente anterior", () => {
  it("na configuração de marca e nos documentos legais", () => {
    expect(offenders(["src/config", "src/content", "src/i18n"])).toEqual([]);
  });
});
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npx vitest run test/brand-hygiene.test.ts`
Esperado: FAIL, listando os vestígios — `src/config/site.ts: Fogão de Ouro`,
`src/config/site.ts: Frei Gaspar`, `src/content/legal.ts: 04.160.109`, entre outros.

- [x] **Step 3: Trocar o objeto `siteConfig`**

Em `src/config/site.ts`, substituir o bloco `export const siteConfig` inteiro
(linhas 130–207) por:

```ts
export const siteConfig: SiteConfig = {
  name: "Restaurante Prato",
  legalName: "PRATO COFFEE SHOP REFEICOES LTDA",
  foundedYear: 1998,
  registration: "03.354.096/0001-84",

  contact: {
    email: "pratocoffee@gmail.com",
    // Sem telefone fixo: o número do cliente é exclusivamente WhatsApp, então
    // `phone` fica de fora e cada CTA de ligar some (ver `phoneLink`).
    whatsapp: {
      // `number` alimenta o link wa.me e por isso é só dígitos, com DDI e sem
      // pontuação — qualquer "+", parêntese ou hífen quebra o deep link.
      number: "5513978208568",
      display: "+55 (13) 97820-8568",
      defaultMessage:
        "Olá! Gostaria de reservar uma mesa no Restaurante Prato. Podem me ajudar?",
    },
    address: {
      street: "R. Augusto Severo, 25 — Centro",
      city: "Santos",
      region: "SP",
      country: "Brasil",
      postalCode: "11010-050",
    },
  },

  // ⚠️ PENDENTE: Instagram e Facebook do restaurante. Alimentam `sameAs` no
  // structured data; enquanto vazio, o campo sai do grafo sozinho.
  social: {},

  nav: [
    { key: "inicio", href: "/" },
    { key: "experiencia", href: "/experiencia" },
    { key: "gastronomia", href: "/gastronomia" },
    { key: "reservas", href: "/reservas" },
    { key: "contato", href: "/contato" },
  ],

  // ⚠️ PENDENTE: horário de funcionamento. Omitido de propósito — ver Task 2.
  // ⚠️ PENDENTE: `servesCuisine`. Omitido de propósito — ver Task 3.

  /**
   * ⚠️ PALETA HERDADA DO CLIENTE ANTERIOR — trocar no PR 2, quando as cores do
   * Restaurante Prato chegarem. Os hex abaixo são do Fogão de Ouro e estão aqui
   * só para o site continuar renderizando; não são a marca deste cliente.
   *
   * Contrastes verificáveis com
   * `node docs/superpowers/specs/2026-08-07-palette-contrast.mjs`.
   */
  theme: {
    light: {
      brand: "#8A5206",
      brandForeground: "#ffffff",
      accent: "#E04F26",
      background: "#EFE9C2",
      foreground: "#474544",
    },
    dark: {
      brand: "#E68A08",
      brandForeground: "#171615",
      accent: "#E04F26",
      background: "#171615",
      foreground: "#EFE9C2",
    },
  },
};
```

Também atualizar o cabeçalho do arquivo (linhas 1–12), trocando
`FOGÃO DE OURO RESTAURANTE — BRAND CONFIGURATION` por
`RESTAURANTE PRATO — BRAND CONFIGURATION`, e o comentário do tipo `OpeningHours`
(linha 44) que cita `"Aberto · fecha às 15h"` por `"Aberto · fecha às 18h"`.

- [x] **Step 4: Trocar `legalEntity` em `src/content/legal.ts`**

Substituir o bloco de comentário do topo (linhas 13–22) e o `legalEntity`
(linhas 27–40):

```ts
/**
 * ⚠️ NÃO PUBLICAR ENQUANTO HOUVER `PENDENTE_*` ABAIXO. Estes documentos são a base
 * legal do tratamento de dados (LGPD): publicar com o dado de outra empresa é pior
 * do que publicar em branco, por isso o campo que falta está marcado em vez de
 * preenchido por aproximação. **Só falta o domínio final** — ainda não comprado.
 *
 * Razão social, CNPJ, endereço, CEP e e-mail vieram do cliente em 17/08/2026; os
 * dígitos verificadores do CNPJ foram conferidos. Esses dados também vivem em
 * `src/config/site.ts` (`legalName`, `registration`, `contact.email`), que alimenta
 * o rodapé e o structured data — os dois arquivos precisam concordar.
 */

/** Marca um dado que ainda não foi fornecido pelo cliente. Nunca inventar. */
const PENDENTE = (campo: string) => `«PENDENTE: ${campo}»`;

/** Controller (data + legal entity) — used across both documents. */
export const legalEntity = {
  legalName: "PRATO COFFEE SHOP REFEICOES LTDA",
  tradeName: "Restaurante Prato",
  cnpj: "03.354.096/0001-84",
  address: "R. Augusto Severo, nº 25 — Centro, CEP 11010-050, Santos/SP, Brasil",
  // Sem telefone fixo: o único canal de voz/mensagem é o WhatsApp, que já consta
  // no site. Os documentos legais passam a apontar só para o e-mail.
  email: "pratocoffee@gmail.com",
  // Mesmo endereço do contato geral: o restaurante não tem um encarregado de
  // dados separado, e apontar a LGPD para uma caixa que ninguém lê seria pior.
  privacyEmail: "pratocoffee@gmail.com",
  site: PENDENTE("domínio final do site"),
} as const;
```

- [x] **Step 5: Remover as referências a telefone dos documentos legais**

`legalEntity.phones` deixou de existir. Em `src/content/legal.ts`:

1. Remover `phones: \`**${e.phones}**\`,` do objeto `b` (linha ~59).
2. Termos §13 "Comunicações" — substituir por:
   ```ts
          `As comunicações entre o Usuário e a Empresa poderão ser realizadas pelos canais oficiais indicados no Site, especialmente o e-mail ${b.email}.`,
   ```
3. Termos §17 "Contato" — substituir por:
   ```ts
          `Em caso de dúvidas sobre estes Termos, entre em contato com ${b.legalName} (${b.tradeName}) pelo e-mail ${b.email}.`,
   ```
4. Privacidade §3 "Encarregado" — remover a segunda linha (`Você também pode entrar
   em contato pelos telefones …`), deixando só a do canal de e-mail.
5. Privacidade §19 "Contato" — substituir por:
   ```ts
          `Dúvidas, solicitações ou reclamações relativas a esta Política e ao tratamento de dados pessoais podem ser encaminhadas a ${b.legalName} (${b.tradeName}) pelo e-mail ${b.privacyEmail}.`,
   ```
6. Atualizar as duas linhas `updated` para
   `"Última atualização: 17 de agosto de 2026"`.

O foro (Comarca de Santos/SP, §16) continua correto — o Prato também é em Santos.

- [x] **Step 6: Atualizar o comentário em `src/i18n/routing.ts`**

Substituir as linhas 9–11:

```ts
 * O site do Restaurante Prato é só em português: o restaurante atende o Centro
 * de Santos e não tem público de língua inglesa que justifique o custo de
 * tradução em cada conteúdo gerenciado pelo admin.
```

- [x] **Step 7: Rodar e ver passar**

Run: `npx vitest run test/brand-hygiene.test.ts && npm run typecheck && npm run lint`
Esperado: guarda verde (1 teste); typecheck e lint limpos.

- [x] **Step 8: Commit**

```bash
git add src/config/site.ts src/content/legal.ts src/i18n/routing.ts test/brand-hygiene.test.ts
git commit -m "$(cat <<'EOF'
CRE: dados do Restaurante Prato na config de marca e nos documentos legais

Razao social, CNPJ, endereco com CEP, e-mail, WhatsApp e ano de fundacao vieram
do cliente em 17/08/2026. Horario, tipo de cozinha, redes e dominio ficam
pendentes; a paleta segue herdada ate o PR 2.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Marca visual interina

Os SVG/PNG em `public/brand/` são o logotipo do Fogão de Ouro. Sem esta task, o site
do Prato exibiria a marca de outra empresa no header, no rodapé, na aba do navegador
e em toda prévia de compartilhamento.

**Files:**
- Delete: `public/brand/logo.svg`, `logo-dark.svg`, `wordmark.svg`, `symbol.svg`, `symbol.png`, `lockup.png`
- Modify: `public/brand/README.md`
- Modify: `src/components/layout/logo.tsx` (reescrita completa)
- Modify: `src/app/icon.tsx`
- Modify: `src/app/apple-icon.tsx`
- Modify: `src/app/[locale]/opengraph-image.tsx`
- Modify: `src/app/globals.css:91-119` (remover as regras `.brand-lockup-*`)
- Modify: `package.json` (remover o script `brand:rasters`)
- Delete: `scripts/build-brand-rasters.mjs`
- Modify: `test/brand-hygiene.test.ts` (novo bloco)

**Interfaces:**
- Consumes: `siteConfig.name` e `siteConfig.theme.dark` da Task 4.
- Produces: `<Logo variant="wordmark" | "lockup" />` com a mesma assinatura de hoje —
  o rodapé (`variant="lockup"`) e o header (padrão) não mudam de chamada.

- [x] **Step 1: Escrever a guarda que falha**

Acrescentar a `test/brand-hygiene.test.ts`, dentro do mesmo `describe`:

```ts
  it("nos componentes e rotas que desenham a marca", () => {
    expect(
      offenders([
        "src/components/layout/logo.tsx",
        "src/app/icon.tsx",
        "src/app/apple-icon.tsx",
        "src/app/[locale]/opengraph-image.tsx",
        "src/app/globals.css",
        "public",
      ]),
    ).toEqual([]);
  });
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npx vitest run test/brand-hygiene.test.ts`
Esperado: FAIL — `logo.tsx: Fogão de Ouro` e `public/brand/README.md: Fogão de Ouro`.

- [x] **Step 3: Remover os arquivos de marca do cliente anterior**

```bash
git rm public/brand/logo.svg public/brand/logo-dark.svg public/brand/wordmark.svg public/brand/symbol.svg public/brand/symbol.png public/brand/lockup.png scripts/build-brand-rasters.mjs
```

- [x] **Step 4: Reescrever `src/components/layout/logo.tsx`**

```tsx
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Marca do restaurante, com link para a home.
 *
 * ⚠️ INTERINO: a logo do Restaurante Prato ainda não chegou. Até lá a marca é
 * tipográfica — o nome na serifada display que o site já carrega via `next/font`
 * para os títulos, sem requisição externa e sem custo de LCP. Os arquivos do
 * cliente anterior foram removidos: exibi-los aqui seria publicar a marca de
 * outra empresa.
 *
 * Quando a logo chegar (PR 2), as duas variantes voltam a ser imagem:
 *  - `wordmark` (padrão) — só o nome, para o header, que tem ~28px de altura
 *  - `lockup` — a marca completa, onde há espaço (rodapé)
 */
export function Logo({
  className,
  variant = "wordmark",
}: {
  className?: string;
  variant?: "wordmark" | "lockup";
}) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center", className)}
      aria-label={siteConfig.name}
    >
      <span
        className={cn(
          "font-serif font-bold tracking-tight text-brand",
          variant === "lockup" ? "text-3xl" : "text-xl",
        )}
      >
        {siteConfig.name}
      </span>
    </Link>
  );
}
```

- [x] **Step 5: Reescrever `src/app/icon.tsx`**

```tsx
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

/**
 * Ícone do app (favicon / aba / PWA), gerado no build.
 *
 * ⚠️ INTERINO: sem a logo do cliente, o ícone é a inicial do nome sobre o fundo
 * escuro da marca. Campo cheio de cor para que o recorte maskable do Android
 * nunca morda transparência. Volta a ser o símbolo da logo no PR 2.
 */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  const { background, brand } = siteConfig.theme.dark;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background,
          color: brand,
          fontSize: 300,
          fontWeight: 700,
        }}
      >
        {siteConfig.name.replace(/^Restaurante\s+/i, "").charAt(0)}
      </div>
    ),
    { ...size },
  );
}
```

- [x] **Step 6: Reescrever `src/app/apple-icon.tsx`**

```tsx
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

// Ícone de toque do iOS (tela de início). 180×180 é o tamanho recomendado pela
// Apple; o iOS aplica a própria máscara arredondada, então o campo cheio
// funciona bem. Mesma marca interina e mesmo motivo de `src/app/icon.tsx`.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const { background, brand } = siteConfig.theme.dark;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background,
          color: brand,
          fontSize: 106,
          fontWeight: 700,
        }}
      >
        {siteConfig.name.replace(/^Restaurante\s+/i, "").charAt(0)}
      </div>
    ),
    { ...size },
  );
}
```

- [x] **Step 7: Reescrever `src/app/[locale]/opengraph-image.tsx`**

Além de tirar o lockup, esta é a hora de corrigir o horário chumbado no código
(linha 59), que ignorava a config.

```tsx
import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

/**
 * Imagem de compartilhamento padrão de todas as rotas (Open Graph + Twitter).
 *
 * ⚠️ INTERINO em dois eixos: a logo do cliente ainda não chegou (a marca é
 * tipográfica) e a fotografia autoral também não. Quando as fotos chegarem, isto
 * deve virar um prato real com a marca por cima — uma imagem de comida converte
 * muito mais numa prévia de WhatsApp do que um cartão de texto.
 */
export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Nada aqui varia por requisição, então o cartão é assado no build. */
export const dynamic = "force-static";

export default function OpengraphImage() {
  const { background, brand, foreground } = siteConfig.theme.dark;
  const { city, region } = siteConfig.contact.address;
  const { openingHours } = siteConfig;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background,
          color: foreground,
        }}
      >
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: brand }}>
          {siteConfig.name}
        </div>
        <div style={{ display: "flex", fontSize: 34, opacity: 0.85 }}>
          Restaurante e cafeteria no Centro de {city}/{region}
        </div>
        {openingHours ? (
          <div style={{ display: "flex", fontSize: 28, color: brand }}>
            {`${openingHours.opens.replace(":00", "h")} às ${openingHours.closes.replace(":00", "h")}`}
          </div>
        ) : null}
      </div>
    ),
    { ...size },
  );
}
```

- [x] **Step 8: Remover as regras `.brand-lockup-*` do `globals.css`**

Elas existiam só para alternar os dois cortes do lockup do cliente anterior.
Apagar as linhas 91–119 (de `.brand-lockup-light {` até o fechamento do bloco
`:root[data-theme="dark"] .brand-lockup-dark { display: block; }`).

- [x] **Step 9: Remover o script de raster do `package.json`**

Apagar a linha:

```jsonc
    "brand:rasters": "node scripts/build-brand-rasters.mjs"
```

E a vírgula da linha anterior (`db:studio`), para o JSON continuar válido.

- [x] **Step 10: Reescrever `public/brand/README.md`**

```markdown
# Marca — Restaurante Prato

⚠️ **Vazio de propósito.** A logo do Restaurante Prato ainda não foi entregue.

Até ela chegar, a marca é **tipográfica**: `src/components/layout/logo.tsx`
desenha `siteConfig.name` na Playfair Display, que o site já carrega via
`next/font` para os títulos. As rotas de imagem (`src/app/icon.tsx`,
`apple-icon.tsx`, `[locale]/opengraph-image.tsx`) compõem com texto sobre o fundo
escuro da marca.

Os arquivos do cliente anterior (Fogão de Ouro) foram removidos junto com o
script `brand:rasters` que os rasterizava — publicar a marca de outra empresa no
site deste cliente não é opção, nem em ambiente fechado.

## Quando a logo chegar (PR 2)

1. Colocar os SVG aqui e documentar cada corte nesta tabela.
2. `satori` — que gera `icon`, `apple-icon` e `opengraph-image` — **não resolve
   `url(#gradiente)`**. Se a logo tiver gradiente, essas rotas precisam embutir
   PNG, e o script de raster volta.
3. Um lockup com texto escuro some no fundo escuro: conferir contraste e, se
   preciso, gerar um corte por tema (foi o que o cliente anterior exigiu).
```

- [x] **Step 11: Rodar e ver passar**

Run: `npx vitest run test/brand-hygiene.test.ts && npm run typecheck && npm run lint && npm run build`
Esperado: guarda verde (2 testes); build gerando as rotas de imagem sem erro de
arquivo ausente.

- [x] **Step 12: Commit**

```bash
git add -A public src test package.json scripts
git commit -m "$(cat <<'EOF'
RMV: logotipo do cliente anterior sai e a marca vira tipografica ate a nova chegar

A imagem OG passa a ler o horario da config em vez de chumbar "11h as 15h".

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Copy interina

A maior superfície. Regra, sem exceção: **substituir quando existe fato confirmado,
remover quando não existe.** Nunca aproximar.

**Files:**
- Modify: `src/messages/pt.json`
- Modify: `src/app/[locale]/(marketing)/experiencia/page.tsx` (remover seções sem copy)
- Modify: `src/app/[locale]/(marketing)/reservas/page.tsx` (remover seções sem copy)
- Modify: `src/app/llms.txt/route.ts:24-40`
- Modify: `src/app/llms-full.txt/route.ts:80`
- Modify: `src/app/manifest.ts:8`
- Modify: `src/lib/validations/menu.ts:7-8`
- Modify: `test/brand-hygiene.test.ts` (novo bloco)

**Interfaces:**
- Consumes: `siteConfig.name` (Task 4) via o placeholder `{brand}`, já alimentado em
  `src/app/[locale]/layout.tsx:51`.
- Produces: nada consumido por tasks posteriores.

- [x] **Step 1: Escrever a guarda que falha**

Acrescentar a `test/brand-hygiene.test.ts`:

```ts
  it("no catálogo de mensagens e nas rotas de texto", () => {
    expect(
      offenders([
        "src/messages",
        "src/app/llms.txt",
        "src/app/llms-full.txt",
        "src/app/manifest.ts",
        "src/lib",
      ]),
    ).toEqual([]);
  });
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npx vitest run test/brand-hygiene.test.ts`
Esperado: FAIL com ~15 vestígios em `src/messages/pt.json` e
`src/app/llms.txt/route.ts`.

- [x] **Step 3: Substituir as chaves do `pt.json` que têm fato confirmado**

| Chave | Novo valor |
|---|---|
| `metadata.defaultTitle` | `"{brand} \| Restaurante e Cafeteria no Centro de Santos"` |
| `metadata.description` | `"Restaurante e cafeteria no Centro de Santos, na R. Augusto Severo, 25. Desde 1998."` |
| `metadata.keywords` | `"restaurante centro de santos, cafeteria centro de santos, onde almoçar no centro de santos, restaurante santos sp"` |
| `home.gastronomia.subtitle` | `"o cardápio da casa."` |
| `home.galeria.subtitle` | `"O ambiente e os pratos da casa."` |
| `home.testimonials.eyebrow` | `"Avaliações do Google"` |
| `home.testimonials.subtitle` | `"A palavra de quem já veio."` |
| `home.cta.title` | `"Venha nos visitar no Centro de Santos."` |
| `home.cta.subtitle` | `"Fale com a gente pelo WhatsApp para reservar a sua mesa."` |
| `experiencia.title` | `"A Experiência"` |
| `experiencia.metaDescription` | `"Restaurante e cafeteria no Centro de Santos, em funcionamento desde 1998."` |
| `experiencia.subtitle` | `"No Centro de Santos desde {foundedYear}."` |
| `experiencia.lead` | `"Restaurante e cafeteria na R. Augusto Severo, 25, no Centro de Santos, em funcionamento desde {foundedYear}."` |
| `experiencia.disclaimer` | `"Restaurante Prato — R. Augusto Severo, 25, Centro, Santos/SP."` |
| `galeria.subtitle` | `"O ambiente e os pratos da casa."` |
| `galeria.photoAlt` | `"Foto do restaurante"` |
| `gastronomia.subtitle` | `"O cardápio da casa."` |
| `gastronomia.ctaTitle` | `"Reserve a sua mesa."` |
| `gastronomia.weekOfTitle` | `"Pratos da semana"` |
| `novidades.subtitle` | `"Novidades e informações do restaurante."` |
| `reservas.metaDescription` | `"Reservas no Restaurante Prato, no Centro de Santos."` |
| `reservas.subtitle` | `"Fale com a gente pelo WhatsApp."` |
| `reservas.groupsTitle` | `"Reservas para grupos e eventos"` |
| `reservas.groupsCopy` | `"Fale com a gente para acertar dia, horário e número de pessoas."` |
| `reservas.groupsMessage` | `"Olá! Gostaria de informações sobre reserva para grupos e eventos."` |
| `contact.title` | `"Estamos no Centro de Santos"` |
| `contact.subtitle` | `"R. Augusto Severo, 25 — Centro, Santos/SP."` |
| `footer.tagline` | `"Restaurante e cafeteria no Centro de Santos."` |

**Sobre os placeholders.** `{brand}` só funciona onde a página passa o parâmetro, e
o next-intl lança erro em tempo de execução se faltar valor. Os três usos que já
recebem valor e devem ser mantidos: `metadata.defaultTitle` e `metadata.titleTemplate`
(alimentados em [`layout.tsx:51-52`](../../../src/app/[locale]/layout.tsx)),
`experiencia.subtitle` com `{foundedYear}`
([`experiencia/page.tsx:75`](../../../src/app/[locale]/(marketing)/experiencia/page.tsx))
e `{years}` no hero, resolvido por `fillYears()`. Em qualquer chave nova, escrever o
nome literal — introduzir `{brand}` onde a página não passa o parâmetro quebra a
página em produção.

- [x] **Step 4: Reduzir o hero a um slide**

`home.hero.slides` tem três slides que descrevem a comida do cliente anterior, e as
três fotos ainda não chegaram (`slideImages` está vazio em
[`hero.tsx:20`](../../../src/components/sections/hero.tsx)). O carrossel já trata
`count <= 1` — desliga o autoplay e esconde setas e indicadores — então um slide é
seguro. Substituir o array por:

```json
      "slides": [
        {
          "title": "Restaurante e cafeteria no Centro de Santos.",
          "subtitle": "Há {years} anos na R. Augusto Severo, no coração do Centro."
        }
      ]
```

- [x] **Step 5: Remover do `pt.json` as chaves sem fato confirmado**

Apagar estes blocos inteiros — não há nada verdadeiro sobre o Prato para pôr no
lugar, e texto vazio é pior do que seção ausente:

- `experiencia.practice` (título, intro e 6 itens sobre churrasco/buffet)
- `experiencia.salao` (180 lugares, Bolsa do Café)
- `experiencia.timing` (horário desconhecido)
- `experiencia.whyFullService` (brasa, peixes, ilha de massas)
- `experiencia.audience.items` → reduzir a `["{years} anos servindo o Centro de Santos"]`
- `experiencia.audience.intro` → `"O que nos trouxe até aqui:"`
- `experiencia.audience.note` → remover a chave
- `experiencia.contactCta.paragraphs` → reduzir a
  `["Fale com a gente para acertar dia, horário e número de pessoas."]`
- `experiencia.contactCta.tagline` → remover a chave
- `reservas.bestTime`, `reservas.bestTimeTitle`, `reservas.hoursTitle`,
  `reservas.hoursLabel`, `reservas.payments`, `reservas.paymentsLabel`,
  `reservas.access`, `reservas.accessLabel`
- `footer.hours` e `footer.payments` — **chaves mortas**: `footer.tsx` não as lê.
  Confirmar antes de apagar com
  `grep -rn "footer.hours\|footer.payments\|t(\"hours\")\|t(\"payments\")" src/`

- [x] **Step 6: Remover as seções órfãs de `experiencia/page.tsx`**

Apagar os blocos JSX que liam as chaves removidas: `practice`, `salao`, `timing`,
`whyFullService`, e o `t("audience.note")` e `t("contactCta.tagline")`. A página
fica com `PageHeader` + `lead` + `audience` + `contactCta` + `disclaimer`.

Rodar `npm run typecheck` depois — `pt.json` é um catálogo tipado e o typecheck
aponta sozinho toda chave que sumiu e ainda é lida.

- [x] **Step 7: Remover as seções órfãs de `reservas/page.tsx`**

Apagar: o bloco `bestTime` (a `<ol>` inteira com o `SectionHeader`), e os `Fact` de
horário, pagamentos e acesso. Sobram o `PageHeader`, o `ReserveButton`, a seção de
grupos e o `Fact` de endereço. O `SectionHeader` da primeira seção passa a usar
`t("practicalTitle")`.

- [x] **Step 8: Ajustar `llms.txt/route.ts`**

Substituir as descrições das linhas 24–40:

```ts
  const core = [
    line("A Experiência", "/experiencia", "A casa e o que esperar de uma visita"),
    line("Nossa Gastronomia", "/gastronomia", "O cardápio da casa"),
    line("Galeria", "/galeria", "Fotos do ambiente e dos pratos"),
    line("Horários & Reservas", "/reservas", "Reservas e informações práticas"),
    line("Contato", "/contato", "Endereço e como chegar"),
  ];
```

- [x] **Step 9: Ajustar `llms-full.txt/route.ts:80`**

```ts
    `> Restaurante e cafeteria no Centro de Santos — ${fullAddress()}.`,
```

- [x] **Step 10: Ajustar `manifest.ts:8`**

```ts
    description: `Restaurante e cafeteria no Centro de ${siteConfig.contact.address.city}`,
```

- [x] **Step 11: Ajustar o comentário em `validations/menu.ts:7-8`**

A ausência de preço era direção do cliente **anterior**, não regra deste código.
Substituir as linhas 7–8 por:

```ts
 * ⚠️ Não existe campo de preço. Isso foi direção de produto do cliente anterior,
 * herdada no fork — não é uma regra deste código. Se o Restaurante Prato quiser
 * exibir preço, é mudança de schema, admin e validação: ver a pergunta aberta
 * §4.1 em
 * `docs/superpowers/specs/2026-08-17-whitelabel-restaurante-prato-design.md`.
```

Sem citar a marca antiga: a guarda varre `src/lib`, e um comentário com o nome do
cliente anterior a deixaria vermelha.

- [x] **Step 12: Rodar e ver passar**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Esperado: guarda verde (3 testes); typecheck limpo (nenhuma chave de `pt.json`
órfã); build gerando as 31 páginas.

- [ ] **Step 13: Conferir as páginas no navegador** ⚠️ **não executado neste
checkout:** sem `.env`, `npm run dev` falha na validação de ambiente
(`DATABASE_URL`), do mesmo modo que o `npm run build`. Fica para quem rodar com
ambiente configurado.

```bash
npm run dev
```

Abrir `/`, `/experiencia`, `/gastronomia`, `/galeria`, `/reservas`, `/contato`.
Esperado: hero com um slide, sem setas nem indicadores; nenhuma seção vazia;
nenhum "Telefone" no rodapé nem em `/contato`; nenhuma menção a horário.

- [x] **Step 14: Commit**

```bash
git add -A src test
git commit -m "$(cat <<'EOF'
RMV: copy do cliente anterior sai do catalogo e das rotas de texto

Cada string vira o que e comprovadamente verdade sobre o Restaurante Prato
(Centro de Santos, desde 1998, endereco real) ou e removida junto com a secao
que a lia. A copy do cliente entra no PR 3.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Documentação e ativos do cliente anterior

Fecha o PR. Enquanto `CLAUDE.md` importar o documento do Fogão de Ouro, toda sessão
de agente neste repositório começa com o contexto errado.

**Files:**
- Delete: `docs/Logos-fogao_de_Ouro/` (pasta inteira)
- Delete: `docs/Copy site Institucional—Fogão de Ouro Restaurante.pdf`
- Delete: `docs/WHITELABEL-FOGAO-DE-OURO.pdf.md`
- Delete: `docs/WHITELABEL-FOGAO-DE-OURO.md`
- Create: `docs/WHITELABEL-RESTAURANTE-PRATO.md`
- Create: `docs/superpowers/README.md`
- Modify: `AGENTS.md`, `CLAUDE.md`, `README.md`, `SECURITY.md`, `docs/RUNBOOK.md`, `docs/seo/ACTION-PLAN.md`
- Modify: `test/brand-hygiene.test.ts` (bloco final)

**Interfaces:**
- Consumes: tudo das Tasks 1–6 (os documentos descrevem o estado final).
- Produces: nada.

- [x] **Step 1: Escrever a guarda final que falha**

Acrescentar dois blocos **dentro** do `describe` que já existe em
`test/brand-hygiene.test.ts` (o `});` de fechamento continua sendo o do arquivo —
não acrescentar outro):

```ts
  it("nos documentos de instrução na raiz do repositório", () => {
    expect(
      offenders(["AGENTS.md", "CLAUDE.md", "README.md", "SECURITY.md"]),
    ).toEqual([]);
  });

  it("em varredura completa do código e dos assets", () => {
    expect(offenders(["src", "public", "prisma"])).toEqual([]);
  });
```

- [x] **Step 2: Rodar e ver falhar**

Run: `npx vitest run test/brand-hygiene.test.ts`
Esperado: FAIL — `AGENTS.md`, `CLAUDE.md`, `README.md` e `SECURITY.md` com vestígios.

- [x] **Step 3: Remover os ativos do cliente anterior**

```bash
git rm -r "docs/Logos-fogao_de_Ouro"
git rm "docs/Copy site Institucional—Fogão de Ouro Restaurante.pdf"
git rm docs/WHITELABEL-FOGAO-DE-OURO.pdf.md
git rm docs/WHITELABEL-FOGAO-DE-OURO.md
```

- [x] **Step 4: Criar `docs/WHITELABEL-RESTAURANTE-PRATO.md`**

Documento equivalente ao anterior, mas descrevendo este cliente. Deve cobrir, no
mínimo: os dados confirmados (§ Global Constraints deste plano), a lista de
pendências com o que cada uma trava, a sequência de PRs do spec, e a regra de nunca
inventar dado do cliente. Referenciar o spec
`docs/superpowers/specs/2026-08-17-whitelabel-restaurante-prato-design.md`.

- [x] **Step 5: Trocar o import do `CLAUDE.md`**

```markdown
@AGENTS.md
@docs/WHITELABEL-RESTAURANTE-PRATO.md
```

- [x] **Step 6: Reescrever o `AGENTS.md`**

Trocar toda descrição do Fogão de Ouro pela do Restaurante Prato. Pontos que
**mudam de conteúdo**, não só de nome:

- O primeiro parágrafo passa a dizer que este repo é um fork do site do Fogão de
  Ouro (não da agência N8X), re-skinado para o Restaurante Prato.
- A seção de marca perde a paleta âmbar/brasa/grafite/creme e a regra do
  `#8A5206` — a paleta do Prato ainda não chegou; registrar que a atual é herdada
  e sai no PR 2.
- A regra "No prices anywhere" deixa de ser regra e vira pergunta aberta.
- Acrescentar: telefone, horário e tipo de cozinha são opcionais de propósito.
- Manter intactas as regras que continuam valendo: Prisma/pooler, `updateTag`,
  server/client boundary, rate limit, `SITE_INDEXABLE`, `pre-push`, `upstream`
  travado, convenção de nomes PT/EN, reviews fora do structured data.

- [x] **Step 7: Reescrever `README.md` e `SECURITY.md`**

- `README.md`: título, descrição, e o badge de CI apontando para
  `Victor227br/restaurantePrato`. O exemplo de `site.ts` (linha ~186) passa a
  mostrar `name: "Restaurante Prato"`. A seção de marca (linha ~226) descreve o
  estado interino tipográfico.
- `SECURITY.md`: e-mail de contato vira `pratocoffee@gmail.com`.

- [x] **Step 8: Ajustar `docs/RUNBOOK.md` e `docs/seo/ACTION-PLAN.md`**

- `RUNBOOK.md` linhas ~229–232: a seção do fork passa a descrever
  `Victor227br/restaurantePrato` com `upstream` = `Grupo-Vannuchi/FogaoDeOuro`, e a
  trava `git remote set-url --push upstream no_push`. Acrescentar que a infra
  (Supabase + Vercel) do Prato ainda é para criar, com o bucket `media` e um
  `SESSION_SECRET` novo.
- `seo/ACTION-PLAN.md` linha 35: trocar as palavras-chave do cliente anterior
  ("restaurante por quilo centro de Santos", "perto da Bolsa do Café") por alvos do
  Prato, marcando que a estratégia definitiva depende do posicionamento que vier
  com a copy.

- [x] **Step 9: Criar `docs/superpowers/README.md`**

```markdown
# Specs e planos

⚠️ **Os documentos datados de agosto de 2026 até o dia 14 descrevem o projeto de
origem, não este.**

Este repositório é um fork do site do **Fogão de Ouro**, que por sua vez era um
fork do site da agência N8X. Os specs e planos daquele projeto ficam aqui de
propósito: eles registram *por que* o código tem a forma que tem — por que as
rotas se chamam o que se chamam, por que `Information` e `Testimonial` mantêm
nome em inglês, por que a paleta traz um hex por tema, por que os funis saíram.
Apagá-los transformaria cada decisão em mistério na próxima sessão.

O rebrand para o **Restaurante Prato** começa em
[`specs/2026-08-17-whitelabel-restaurante-prato-design.md`](specs/2026-08-17-whitelabel-restaurante-prato-design.md).
```

- [x] **Step 10: Rodar a validação completa**

Run: `npm run typecheck && npm run lint && npm run test && npm run build`
Esperado: tudo verde, incluindo os 5 blocos da guarda de higiene.

- [x] **Step 11: Conferir que nada do cliente anterior sobrou**

```bash
grep -ril -e "fogao" -e "fogão" -e "frei gaspar" -e "bolsa do caf" src/ public/ prisma/ *.md | grep -v node_modules
```

Esperado: nenhuma saída. *(`docs/` fica de fora de propósito — ver
`docs/superpowers/README.md`.)*

- [x] **Step 12: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
docs: o repositorio passa a descrever o Restaurante Prato

CLAUDE.md importava o documento do cliente anterior, entao toda sessao de agente
comecava com o contexto errado. Os ativos do Fogao de Ouro (logos, PDF de copy)
saem do repo; os specs e planos de engenharia ficam, com aviso, por explicarem o
porque do codigo.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Pendências que este PR deixa marcadas

Nenhuma é falha de execução — são dados que o cliente ainda não enviou.

| Marcado em | O que falta |
|---|---|
| `site.ts` → `social: {}` | Instagram / Facebook |
| `site.ts` → sem `openingHours` | horário de funcionamento |
| `site.ts` → sem `servesCuisine` | tipo de cozinha |
| `site.ts` → `theme` | paleta (a atual é herdada — PR 2) |
| `legal.ts` → `site` | domínio final |
| `public/brand/README.md` | logo |
| `hero.tsx` → `slideImages` | fotos do hero |
| spec §4.1 | o cardápio do Prato exibe preço? |
