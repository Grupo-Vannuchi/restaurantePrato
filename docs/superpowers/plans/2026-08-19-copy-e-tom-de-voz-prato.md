# Copy, tom de voz e dados de operação do Prato — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a copy interina do site pelo texto definitivo do cliente, aplicar
o tom de voz do documento e publicar os três dados de operação que ele destrava
(horário, Instagram, tipo de cozinha).

**Architecture:** Quase tudo é edição de `src/messages/pt.json` e
`src/config/site.ts`. Onde um rótulo novo precisa de destino novo, a edição de
código vem junto na mesma task — rótulo sem destino é bug de navegação. Uma
função nova (`openingHoursLabel`) centraliza a linha de horário que hoje está
duplicada e errada em dois arquivos. Nenhuma rota renomeada, nenhuma migration.

**Tech Stack:** Next 16 + Turbopack · next-intl (PT-only) · Vitest · TypeScript

**Spec:** [`docs/superpowers/specs/2026-08-19-copy-e-tom-de-voz-prato-design.md`](../specs/2026-08-19-copy-e-tom-de-voz-prato-design.md)

## Global Constraints

Valem para **todas** as tasks abaixo.

- **Branch `Development`.** Não fazer `git push`, não mergear em `main`. O humano
  empurra manualmente.
- **Validar antes de declarar pronto:** `npm run typecheck && npm run lint && npm run build`.
  Reportar falha honestamente em vez de contornar.
- **Nunca inventar dado do cliente.** Substituir só onde há fato confirmado;
  remover onde não há.
- **O endereço não muda.** Fica `R. Augusto Severo, 25 — Centro`, CEP `11010-050`.
  O documento do cliente diz "09"; está sob confirmação (§3.1 do spec). Nenhuma
  task deste plano toca `contact.address`, `experiencia.disclaimer`,
  `contact.subtitle` nem o trecho de endereço de `metadata.description`.
- **Nenhum emoji em copy.** Nem em `src/messages/pt.json`, nem em componente de
  seção, nem em metadata, `llms.txt` ou imagem OG. O emoji de
  `src/lib/lead-notify.ts` é mensagem operacional para o restaurante e **não
  muda**.
- **"Centro de Santos", nunca "Centro Histórico".**
- **Português apenas.** Toda string de UI vai para `src/messages/pt.json`. Não
  existe `en.json`.
- **Depoimento nunca entra em structured data.** Não wire `Testimonial` no
  `Restaurant` JSON-LD, em hipótese nenhuma.
- **`SITE_INDEXABLE` continua `false`.** Não tocar.
- **Commits convencionais**, terminando com:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
- **Um `pre-push` hook roda `npm run typecheck`.** Não usar `--no-verify`.

---

## File Structure

| Arquivo | Responsabilidade | Tasks |
|---|---|---|
| `src/config/site.ts` | marca, contato, horário, cozinha, social + helpers | 1, 2, 3 |
| `test/site-config.test.ts` | testes dos helpers de config | 1 |
| `src/app/llms.txt/route.ts` | mapa do site para crawlers de IA | 1, 9 |
| `src/app/llms-full.txt/route.ts` | versão longa do mesmo mapa | 9 |
| `src/app/manifest.ts` | manifest PWA | 9 |
| `src/app/[locale]/opengraph-image.tsx` | cartão de compartilhamento | 1, 9 |
| `src/messages/pt.json` | **todo** o texto de UI | 2, 4–10 |
| `src/components/sections/hero-carousel.tsx` | destino dos CTAs do hero | 4 |
| `src/app/[locale]/(marketing)/experiencia/page.tsx` | chamada de `subtitle`, fechamento | 5, 7 |
| `src/app/[locale]/(marketing)/reservas/page.tsx` | grade de horários | 6 |
| `src/components/sections/closing-cta.tsx` | **novo** — card de fechamento compartilhado | 7 |
| `src/components/sections/cta.tsx` | fechamento da home | 7 |
| `src/app/[locale]/(marketing)/gastronomia/page.tsx` | seção de fechamento | 7 |
| `src/app/[locale]/(marketing)/contato/page.tsx` | canal do Instagram | 2 |
| `test/copy-hygiene.test.ts` | **novo** — guarda de emoji e de "Centro Histórico" | 4 |
| `test/brand-hygiene.test.ts` | guarda de vestígio do cliente anterior | 4 |
| `docs/WHITELABEL-RESTAURANTE-PRATO.md` | pendências e dados confirmados | 11 |

---

### Task 1: Horário de funcionamento — e a linha que esquecia os dias

**Files:**
- Modify: `src/config/site.ts`
- Modify: `src/app/llms.txt/route.ts:41-48`
- Modify: `src/app/[locale]/opengraph-image.tsx:22,47-51`
- Test: `test/site-config.test.ts`

**Interfaces:**
- Consumes: `OpeningHours` (já existe em `src/config/site.ts`), `siteConfig`
- Produces: `openingHoursLabel(hours?: OpeningHours): string | null` — exportada
  de `src/config/site.ts`. Devolve `"Seg a sex, das 11h às 15h"` ou `null`.
  Usada nas tasks 6 e 9.

**Por que existe:** `llms.txt` e a imagem OG montam a linha de horário a partir
de `opens`/`closes` **ignorando `days`**. Hoje a string sai vazia porque
`openingHours` está omitido. No instante em que o horário for publicado, os dois
passam a dizer "Aberto das 11h às 15h" — sem dias, afirmando que o restaurante
abre no sábado. Publicar o horário e corrigir a string é a mesma task porque a
primeira metade **cria** o defeito da segunda.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final de `test/site-config.test.ts`:

```ts
describe("openingHoursLabel", () => {
  it("devolve null enquanto não há horário conhecido", () => {
    expect(openingHoursLabel(undefined)).toBeNull();
  });

  it("resume um intervalo contíguo de dias", () => {
    expect(
      openingHoursLabel({
        days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "11:00",
        closes: "15:00",
      }),
    ).toBe("Seg a sex, das 11h às 15h");
  });

  it("nomeia um único dia sem inventar intervalo", () => {
    expect(
      openingHoursLabel({
        days: ["Saturday"],
        opens: "11:00",
        closes: "15:00",
      }),
    ).toBe("Sáb, das 11h às 15h");
  });

  it("lista dias não contíguos em vez de fingir que são um intervalo", () => {
    expect(
      openingHoursLabel({
        days: ["Monday", "Wednesday", "Friday"],
        opens: "11:00",
        closes: "15:00",
      }),
    ).toBe("Seg, qua, sex, das 11h às 15h");
  });

  it("preserva os minutos quando o horário não fecha na hora cheia", () => {
    expect(
      openingHoursLabel({
        days: ["Monday"],
        opens: "11:30",
        closes: "15:45",
      }),
    ).toBe("Seg, das 11h30 às 15h45");
  });

  it("nunca publica horário sem dizer em que dias", () => {
    // Esta é a regressão que a task existe para impedir: uma linha que diz
    // "das 11h às 15h" e nada mais afirma, para quem lê, que o restaurante
    // abre todo dia — e manda a pessoa para a porta fechada no sábado.
    const label = openingHoursLabel();
    if (label !== null) {
      expect(label).toMatch(/seg|ter|qua|qui|sex|sáb|dom/i);
    }
  });
});
```

E trocar a linha de import do topo do arquivo por:

```ts
import {
  openingHoursLabel,
  phoneLink,
  siteConfig,
  type SiteConfig,
} from "@/config/site";
```

- [ ] **Step 2: Rodar e confirmar que falha**

```bash
npm test -- test/site-config.test.ts
```

Esperado: FAIL. O erro é de import — `openingHoursLabel` não existe ainda.

- [ ] **Step 3: Implementar o helper**

Em `src/config/site.ts`, logo **depois** da função `fillYears` e **antes** de
`hasWhatsapp`, colar:

```ts
/** Ordem canônica da semana, para detectar um intervalo contíguo de dias. */
const DAY_ORDER: OpeningHours["days"] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Rótulo curto em português de cada dia da semana. */
const DAY_LABELS: Record<OpeningHours["days"][number], string> = {
  Monday: "seg",
  Tuesday: "ter",
  Wednesday: "qua",
  Thursday: "qui",
  Friday: "sex",
  Saturday: "sáb",
  Sunday: "dom",
};

/** "11:00" → "11h"; "11:30" → "11h30". */
function hourLabel(value: string): string {
  const [h, m] = value.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/**
 * Uma linha legível de horário — "Seg a sex, das 11h às 15h" — ou `null`
 * enquanto o horário do restaurante não é conhecido.
 *
 * ⚠️ O intervalo de dias faz parte do contrato, não é enfeite. Antes desta
 * função, `llms.txt` e a imagem OG montavam a linha só com `opens`/`closes` e
 * produziam "Aberto das 11h às 15h" — que afirma, para quem lê, que a casa abre
 * todo dia. O Prato fecha no fim de semana; a string sem dias mandaria o
 * visitante para a porta fechada no sábado. Qualquer consumidor novo de horário
 * deve chamar isto em vez de formatar por conta.
 */
export function openingHoursLabel(
  hours: OpeningHours | undefined = siteConfig.openingHours,
): string | null {
  if (!hours) return null;

  const ordered = DAY_ORDER.filter((day) => hours.days.includes(day));
  if (ordered.length === 0) return null;

  const first = DAY_LABELS[ordered[0]];
  const last = DAY_LABELS[ordered[ordered.length - 1]];
  const contiguous =
    DAY_ORDER.indexOf(ordered[ordered.length - 1]) -
      DAY_ORDER.indexOf(ordered[0]) ===
    ordered.length - 1;

  const range =
    ordered.length === 1
      ? first
      : contiguous
        ? `${first} a ${last}`
        : ordered.map((day) => DAY_LABELS[day]).join(", ");

  const label = `${range}, das ${hourLabel(hours.opens)} às ${hourLabel(hours.closes)}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}
```

- [ ] **Step 4: Publicar o horário confirmado**

Em `src/config/site.ts`, dentro de `siteConfig`, substituir o comentário

```ts
  // ⚠️ PENDENTE: horário de funcionamento. Omitido de propósito — ver Task 2.
  // ⚠️ PENDENTE: `servesCuisine`. Omitido de propósito — ver Task 3.
```

por

```ts
  // Confirmado pelo cliente em 19/08/2026. Alimenta `openingHoursSpecification`
  // no `Restaurant` JSON-LD, a grade de horários de `/reservas`, a linha do
  // `/llms.txt` e a imagem OG — todos via `openingHoursLabel()`.
  openingHours: {
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "11:00",
    closes: "15:00",
  },

  // ⚠️ PENDENTE: `servesCuisine`. Omitido de propósito — ver Task 3.
```

- [ ] **Step 5: Rodar os testes e confirmar que passam**

```bash
npm test -- test/site-config.test.ts
```

Esperado: PASS, 8 testes (os 2 que já existiam + os 6 novos).

- [ ] **Step 6: Corrigir a linha de horário do `llms.txt`**

Em `src/app/llms.txt/route.ts`, trocar o import do topo:

```ts
import { openingHoursLabel, siteConfig, fullAddress } from "@/config/site";
```

e substituir o bloco

```ts
  const { openingHours } = siteConfig;
  const hours = openingHours
    ? ` Aberto das ${openingHours.opens.replace(":00", "h")} às ${openingHours.closes.replace(":00", "h")}.`
    : "";
```

por

```ts
  // `openingHoursLabel` já inclui os dias — ver o aviso na função. Formatar
  // aqui a partir de `opens`/`closes` publicaria "aberto das 11h às 15h" sem
  // dizer que a casa fecha no fim de semana.
  const label = openingHoursLabel();
  const hours = label ? ` ${label}.` : "";
```

- [ ] **Step 7: Corrigir a linha de horário da imagem OG**

Em `src/app/[locale]/opengraph-image.tsx`, trocar o import:

```ts
import { openingHoursLabel, siteConfig } from "@/config/site";
```

substituir

```ts
  const { openingHours } = siteConfig;
```

por

```ts
  const hours = openingHoursLabel();
```

e substituir o bloco JSX

```tsx
        {openingHours ? (
          <div style={{ display: "flex", fontSize: 28, color: brand }}>
            {`${openingHours.opens.replace(":00", "h")} às ${openingHours.closes.replace(":00", "h")}`}
          </div>
        ) : null}
```

por

```tsx
        {hours ? (
          <div style={{ display: "flex", fontSize: 28, color: brand }}>
            {hours}
          </div>
        ) : null}
```

- [ ] **Step 8: Validar**

```bash
npm run typecheck && npm run lint && npm test
```

Esperado: os três passam.

- [ ] **Step 9: Conferir o texto renderizado**

```bash
npm run dev
```

Abrir `http://localhost:3000/llms.txt` e confirmar que a primeira linha de
citação termina com **"Seg a sex, das 11h às 15h."** — com os dias. Encerrar o
dev server com Ctrl+C.

- [ ] **Step 10: Commit**

```bash
git add src/config/site.ts src/app/llms.txt/route.ts "src/app/[locale]/opengraph-image.tsx" test/site-config.test.ts
git commit -m "$(cat <<'EOF'
UPD: publica o horario de funcionamento e conserta a linha sem dias

O cliente confirmou seg a sex, das 11h as 15h. Publicar isso destrava
`openingHoursSpecification` no JSON-LD, a grade de /reservas, o /llms.txt
e a imagem OG.

Mas dois desses consumidores montavam a linha so com opens/closes,
ignorando `days`. Enquanto openingHours estava omitido a string saia
vazia e o defeito ficava latente; ao publicar o horario ele passaria a
afirmar "aberto das 11h as 15h" sem dizer que a casa fecha no fim de
semana -- mandando o visitante para a porta fechada no sabado.

`openingHoursLabel()` centraliza a formatacao e sempre inclui os dias.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Instagram

**Files:**
- Modify: `src/config/site.ts`
- Modify: `src/messages/pt.json` (`contact.labels`)
- Modify: `src/app/[locale]/(marketing)/contato/page.tsx`

**Interfaces:**
- Consumes: `siteConfig.social` (já existe)
- Produces: chave `contact.labels.instagram` no catálogo

**O que já funciona sozinho:** o rodapé itera `siteConfig.social` genericamente
(`src/components/layout/footer.tsx:22`) e o `sameAs` do JSON-LD lê o mesmo
objeto. Nenhum dos dois precisa de edição — publicar em `site.ts` basta.

- [ ] **Step 1: Conferir que o perfil existe**

Abrir `https://instagram.com/restaurante.prato` no navegador. Confirmar que o
perfil existe e é o do restaurante.

**Se o perfil não existir com esse handle exato, PARE esta task** e reporte. Um
`sameAs` apontando para perfil inexistente é sinal ruim de entidade — pior do
que não ter `sameAs`.

- [ ] **Step 2: Publicar o Instagram**

Em `src/config/site.ts`, substituir

```ts
  // ⚠️ PENDENTE: Instagram e Facebook do restaurante. Alimentam `sameAs` no
  // structured data; enquanto vazio, o campo sai do grafo sozinho.
  social: {},
```

por

```ts
  // Instagram confirmado em 19/08/2026; alimenta `sameAs` no structured data e
  // a lista de redes do rodapé, que itera este objeto genericamente.
  // ⚠️ PENDENTE: Facebook. Enquanto ausente, sai do grafo sozinho.
  social: {
    instagram: "https://instagram.com/restaurante.prato",
  },
```

- [ ] **Step 3: Adicionar o rótulo ao catálogo**

Em `src/messages/pt.json`, dentro de `contact.labels`, adicionar a chave
`instagram` depois de `whatsapp`:

```json
    "labels": {
      "email": "E-mail",
      "phone": "Telefone",
      "whatsapp": "WhatsApp",
      "instagram": "Instagram",
      "address": "Endereço"
    },
```

- [ ] **Step 4: Listar o Instagram em `/contato`**

Em `src/app/[locale]/(marketing)/contato/page.tsx`, trocar o import de ícones:

```ts
import { Mail, Phone, MessageCircle, MapPin, Instagram } from "lucide-react";
```

e, dentro do array `channels`, inserir logo **depois** do bloco do WhatsApp e
**antes** do objeto de `MapPin`:

```ts
    // Só listado quando há perfil configurado — mesmo contrato do WhatsApp
    // acima. O rodapé já itera `siteConfig.social` sozinho.
    ...(siteConfig.social.instagram
      ? [
          {
            icon: Instagram,
            label: t("labels.instagram"),
            value: "@restaurante.prato",
            href: siteConfig.social.instagram,
          },
        ]
      : []),
```

- [ ] **Step 5: Validar**

```bash
npm run typecheck && npm run lint && npm test
```

Esperado: os três passam.

- [ ] **Step 6: Conferir na tela**

```bash
npm run dev
```

Abrir `http://localhost:3000/contato` e confirmar: o Instagram aparece na lista
lateral com ícone, e o link abre em nova aba. Conferir também que o rodapé
mostra o ícone do Instagram. Encerrar com Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add src/config/site.ts src/messages/pt.json "src/app/[locale]/(marketing)/contato/page.tsx"
git commit -m "$(cat <<'EOF'
UPD: publica o Instagram do restaurante

Confirmado pelo cliente em 19/08. Alimenta `sameAs` no structured data,
a lista de redes do rodape (que ja iterava siteConfig.social) e um canal
novo em /contato.

Facebook segue pendente e continua saindo do grafo sozinho.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Tipo de cozinha

**Files:**
- Modify: `src/config/site.ts`

**Interfaces:**
- Consumes: `servesCuisine?: string[]` (campo já existe no tipo `SiteConfig`)
- Produces: nada de novo — `src/components/json-ld.tsx:60` já emite o campo
  quando ele existe

- [ ] **Step 1: Publicar o tipo de cozinha**

Em `src/config/site.ts`, substituir

```ts
  // ⚠️ PENDENTE: `servesCuisine`. Omitido de propósito — ver Task 3.
```

por

```ts
  // Derivado do documento de copy do cliente (19/08/2026): churrasco na brasa,
  // buffet e comida caseira. "Buffet" fica de fora de propósito — é modelo de
  // serviço, não cozinha, e este campo alimenta `Restaurant.servesCuisine`.
  servesCuisine: ["Brasileira", "Churrasco"],
```

- [ ] **Step 2: Validar**

```bash
npm run typecheck && npm run lint && npm test
```

Esperado: os três passam.

- [ ] **Step 3: Conferir o grafo inteiro do `Restaurant`**

Esta é a última das três tasks de dado, então é aqui que o JSON-LD fecha.

```bash
npm run dev
```

Abrir `http://localhost:3000`, ver o código-fonte da página (`Ctrl+U`) e
localizar o `<script type="application/ld+json">` do `Restaurant`. Confirmar que
ele contém os três campos que este plano destravou:

```json
"servesCuisine":["Brasileira","Churrasco"]
"sameAs":["https://instagram.com/restaurante.prato"]
"openingHoursSpecification":[{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday"],"opens":"11:00","closes":"15:00"}]
```

E confirmar que ele **não** contém `"review"` nem `"aggregateRating"` — review
próprio no schema do próprio site é *self-serving review* e custa o rich result
inteiro. Encerrar com Ctrl+C.

Se `sameAs` ou `openingHoursSpecification` estiverem ausentes, as tasks 1 ou 2
não foram concluídas — reporte em vez de seguir.

- [ ] **Step 4: Commit**

```bash
git add src/config/site.ts
git commit -m "$(cat <<'EOF'
UPD: declara o tipo de cozinha no schema Restaurant

Brasileira e churrasco, derivados do documento de copy do cliente.
"Buffet" fica de fora: e modelo de servico, nao cozinha.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Home — novo tom de voz, e as guardas que o congelam

**Files:**
- Modify: `src/messages/pt.json` (namespace `home`)
- Modify: `src/components/sections/hero-carousel.tsx:136`
- Modify: `test/brand-hygiene.test.ts`
- Create: `test/copy-hygiene.test.ts`

**Interfaces:**
- Consumes: nada de tasks anteriores
- Produces: nada consumido por tasks posteriores

**Contexto que o implementador precisa:** os cinco slots da home já existem
(`Hero`, `MenuPreview`, `GalleryPreview`, `Testimonials`, `CTA`). Esta task só
troca texto — **nenhuma seção nova**. `home.cta.button` **não** precisa de
mudança de código: `src/components/sections/cta.tsx:28` já renderiza um `Link`
para `/reservas` com esse rótulo, e um `ReserveButton` de WhatsApp ao lado.

- [ ] **Step 1: Escrever as guardas que falham**

Criar `test/copy-hygiene.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const catalog = readFileSync(
  join(process.cwd(), "src/messages/pt.json"),
  "utf8",
);

describe("higiene da copy", () => {
  it("não usa emoji em nenhuma string do catálogo", () => {
    // Decisão de 19/08 (§3.5 do spec): o guia de tom de voz do cliente
    // recomenda emoji, mas o site do qual este repo é fork nunca usou, e o
    // catálogo inteiro é lido por metadata, `llms.txt` e imagem OG — onde
    // emoji vira ruído no resultado de busca. O único emoji legítimo do
    // projeto está em `src/lib/lead-notify.ts`, que é mensagem operacional
    // enviada AO restaurante, não copy do site.
    const found = [...catalog.matchAll(/\p{Extended_Pictographic}/gu)].map(
      (m) => m[0],
    );
    expect(found).toEqual([]);
  });
});
```

E, em `test/brand-hygiene.test.ts`, adicionar `"Centro Histórico"` ao array
`FORBIDDEN`, logo depois de `"Museu do Café"`:

```ts
  "Bolsa do Café",
  "Museu do Café",
  "Centro Histórico",
  "180 lugares",
```

- [ ] **Step 2: Rodar e confirmar que passam já (são guardas, não TDD)**

```bash
npm test -- test/copy-hygiene.test.ts test/brand-hygiene.test.ts
```

Esperado: PASS. As duas guardas passam **antes** da mudança de copy — é esse o
ponto: elas existem para falhar se a copy nova introduzir emoji ou "Centro
Histórico". Se alguma falhar agora, PARE e reporte: significa que o repo já
tem o vestígio.

- [ ] **Step 3: Reescrever o `home.hero`**

Em `src/messages/pt.json`, substituir o objeto `home.hero` inteiro por:

```json
    "hero": {
      "eyebrow": "{years} anos no Centro de Santos",
      "primaryCta": "Ver o cardápio",
      "secondaryCta": "Como chegar",
      "carouselLabel": "Destaques",
      "prevSlide": "Slide anterior",
      "nextSlide": "Próximo slide",
      "goToSlide": "Ir para o slide {n}",
      "slides": [
        {
          "title": "A sua melhor e mais saborosa pausa do dia.",
          "subtitle": "Um buffet completo, sempre quentinho, com aquele tempero caseiro inconfundível — e o autêntico churrasco na brasa, fatiado na hora, para recarregar a energia pro expediente."
        }
      ]
    },
```

- [ ] **Step 4: Apontar o CTA primário para o cardápio**

Em `src/components/sections/hero-carousel.tsx`, na linha 136, trocar

```tsx
                    href="/experiencia"
```

por

```tsx
                    href="/gastronomia"
```

O CTA secundário continua em `/contato` — é lá que está o mapa, e o rótulo
"Como chegar" já casa com o destino.

- [ ] **Step 5: Reescrever as outras quatro seções da home**

Em `src/messages/pt.json`, substituir os objetos `home.gastronomia`,
`home.galeria`, `home.testimonials` e `home.cta` por:

```json
    "gastronomia": {
      "eyebrow": "Nossa comida",
      "title": "Fartura, sabor e agilidade pro seu dia a dia.",
      "subtitle": "Sua pausa é sagrada. Por isso o buffet é completo, fresquinho e com bastante proteína — o almoço de responsa no Centro, sem frescura e com muito sabor."
    },
    "galeria": {
      "eyebrow": "O nosso espaço",
      "title": "O restaurante do dia a dia.",
      "subtitle": "Sem formalidade, feito para quem trabalha duro no Centro."
    },
    "testimonials": {
      "eyebrow": "Avaliações do Google",
      "title": "O que dizem por aqui",
      "subtitle": "Quem experimenta, não troca."
    },
    "cta": {
      "title": "11h da manhã: o buffet já está servido.",
      "subtitle": "Gosta de almoçar mais cedo e com tranquilidade? A partir das 11h a comida já está montada, bem quente, com o churrasco saindo direto da brasa.",
      "button": "Veja nossos horários"
    }
```

- [ ] **Step 6: Validar**

```bash
npm run typecheck && npm run lint && npm test
```

Esperado: os três passam, incluindo as duas guardas do Step 1.

- [ ] **Step 7: Conferir na tela**

```bash
npm run dev
```

Abrir `http://localhost:3000` e confirmar, de cima para baixo:

1. o eyebrow ainda mostra os anos de casa ("28 anos no Centro de Santos" em 2026);
2. o H1 é "A sua melhor e mais saborosa pausa do dia.";
3. o botão primário diz "Ver o cardápio" e **leva para `/gastronomia`**;
4. o botão secundário diz "Como chegar" e leva para `/contato`;
5. o bloco final diz "11h da manhã: o buffet já está servido." com o botão
   "Veja nossos horários" levando para `/reservas`, e o botão de WhatsApp ao
   lado dele.

Encerrar com Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add src/messages/pt.json src/components/sections/hero-carousel.tsx test/copy-hygiene.test.ts test/brand-hygiene.test.ts
git commit -m "$(cat <<'EOF'
UPD: a home passa a falar com a voz do Prato

Copy definitiva do cliente nos cinco slots que ja existiam -- nenhuma
secao nova. O CTA primario do hero vira "Ver o cardapio" e por isso o
href muda de /experiencia para /gastronomia: rotulo sem destino
correspondente e bug de navegacao, nao detalhe de copy.

Duas guardas congelam decisoes do spec: nenhum emoji no catalogo (o guia
do cliente recomenda, mas o site nunca usou e o catalogo alimenta
metadata e OG) e "Centro Historico" entra na lista de vestigios do
cliente anterior.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `/experiencia` — a Pausa de Respeito

**Files:**
- Modify: `src/messages/pt.json` (namespace `experiencia`)
- Modify: `src/app/[locale]/(marketing)/experiencia/page.tsx:72`

**Interfaces:**
- Consumes: nada de tasks anteriores
- Produces: nada consumido por tasks posteriores

**Contexto que o implementador precisa:** `experiencia.title` alimenta **o H1 e
o `<title>` da metatag ao mesmo tempo** — por isso ele continua "A Experiência",
que é o que funciona em resultado de busca, e a frase do documento vai para
`subtitle`. Os cinco cards caem em `audience.items`, que já é uma lista
renderizada pelo componente `CheckList` da própria página.

⚠️ **`CheckList` recebe `string[]` e renderiza como texto puro.** Diferente de
`lead` e `audience.intro`, que passam por `t.rich(…, richTags)`. Um `**negrito**`
dentro de um item apareceria literalmente na tela. A separação entre o rótulo e a
frase é o travessão.

- [ ] **Step 1: Reescrever o namespace**

Em `src/messages/pt.json`, substituir o objeto `experiencia` inteiro por:

```json
  "experiencia": {
    "title": "A Experiência",
    "metaDescription": "Buffet completo e churrasco na brasa no Centro de Santos, de segunda a sexta, das 11h às 15h.",
    "subtitle": "A sua pausa merecida no coração do Centro.",
    "lead": "Muito mais do que uma refeição rápida. O Prato foi pensado para quem valoriza o próprio tempo: ambiente dinâmico, alta rotatividade e nada de longas esperas. Comida de verdade, farta e sempre quente, para você recarregar as energias e voltar pontualmente ao expediente. No Centro de Santos desde {foundedYear}.",
    "audience": {
      "title": "Quem experimenta, não troca.",
      "intro": "O que você encontra aqui todo dia:",
      "items": [
        "Churrasco na brasa — o barulho da carne chiando e aquela casquinha dourada. Os melhores cortes, todos os dias.",
        "Buffet completo — variedade farta de saladas, pratos quentes e guarnições para montar o seu pratão.",
        "Agilidade — pegou, serviu, comeu. O salão é preparado para você não perder um minuto da sua pausa.",
        "Comida quente — bancada quente do início ao fim do expediente.",
        "Ambiente acolhedor — o restaurante do dia a dia, sem formalidade, feito para quem trabalha duro no Centro."
      ]
    },
    "contactCta": {
      "title": "Vem almoçar com a gente.",
      "paragraphs": [
        "O buffet está servido a partir das 11h, de segunda a sexta. Chegue cedo e aproveite o salão tranquilo."
      ]
    },
    "disclaimer": "Restaurante Prato — R. Augusto Severo, 25, Centro, Santos/SP."
  },
```

Note que `disclaimer` fica **idêntico** ao que já estava — o endereço não muda
(constraint global).

- [ ] **Step 2: Rodar o typecheck e ver a falha esperada**

```bash
npm run typecheck
```

Esperado: FAIL em `experiencia/page.tsx`. O `subtitle` perdeu o placeholder
`{foundedYear}`, e o next-intl tipado rejeita a chamada que ainda passa valores
("no values accepted" / "Expected 1 arguments, but got 2" ou similar).

Se **não** falhar, ainda assim faça o Step 3 — a chamada com valor inútil é
ruído.

- [ ] **Step 3: Ajustar a chamada de `subtitle`**

Em `src/app/[locale]/(marketing)/experiencia/page.tsx`, na linha 72, trocar

```tsx
        subtitle={t("subtitle", { foundedYear: siteConfig.foundedYear })}
```

por

```tsx
        subtitle={t("subtitle")}
```

`lead` **mantém** `{foundedYear}` e a chamada dele não muda. Se o import de
`siteConfig` ficar sem uso no arquivo, o `npm run lint` vai apontar — nesse caso
remova o import; caso contrário, deixe.

- [ ] **Step 4: Validar**

```bash
npm run typecheck && npm run lint && npm test
```

Esperado: os três passam.

- [ ] **Step 5: Conferir na tela**

```bash
npm run dev
```

Abrir `http://localhost:3000/experiencia` e confirmar:

1. o H1 é "A Experiência" e o subtítulo é "A sua pausa merecida no coração do
   Centro.";
2. o parágrafo de abertura termina com "No Centro de Santos desde 1998." — com
   o ano resolvido, **não** com `{foundedYear}` literal na tela;
3. a lista tem cinco itens e **nenhum** deles mostra asterisco na tela;
4. a aba do navegador diz "A Experiência · Restaurante Prato".

Encerrar com Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add src/messages/pt.json "src/app/[locale]/(marketing)/experiencia/page.tsx"
git commit -m "$(cat <<'EOF'
UPD: /experiencia recebe a Pausa de Respeito

Os cinco cards do documento do cliente caem em audience.items, que ja
era uma lista. Texto puro, sem negrito: o CheckList desta pagina recebe
string[] e renderiza como texto -- markdown apareceria literal na tela.

`title` continua "A Experiencia" porque alimenta o H1 e a metatag ao
mesmo tempo, e a frase do documento vai para o subtitulo. Como o
subtitulo perdeu o placeholder {foundedYear}, a chamada da pagina passa
a ser t("subtitle") sem argumentos; `lead` mantem o placeholder.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `/reservas` vira "Horários"

**Files:**
- Modify: `src/messages/pt.json` (`nav.reservas`, namespace `reservas`)
- Modify: `src/app/[locale]/(marketing)/reservas/page.tsx`

**Interfaces:**
- Consumes: `openingHoursLabel()` da Task 1
- Produces: nada consumido por tasks posteriores

**Contexto que o implementador precisa:** a rota continua `/reservas` e
`acceptsReservations: true` continua no JSON-LD — só o **rótulo** e a ênfase
mudam. A reserva sobrevive na seção de grupos e eventos, que já existe na página.
Renomear a rota seria três edições acopladas (`NavKey`, chaves `nav`, pastas em
`(marketing)/`) por zero mudança visível; a decisão do projeto é não fazer isso.

A página já importa `Fact` e o ícone `Clock` **sem usar** — o slot foi deixado
pronto esperando o horário.

- [ ] **Step 1: Reescrever o rótulo de nav e o namespace**

Em `src/messages/pt.json`, dentro de `nav`, trocar

```json
    "reservas": "Horários & Reservas",
```

por

```json
    "reservas": "Horários",
```

E substituir o objeto `reservas` inteiro por:

```json
  "reservas": {
    "title": "Horários",
    "metaDescription": "Horário do Restaurante Prato, no Centro de Santos: de segunda a sexta, das 11h às 15h.",
    "subtitle": "De segunda a sexta, das 11h às 15h.",
    "groupsTitle": "Reservas para grupos e eventos",
    "groupsCopy": "Vai trazer a equipe? Fale com a gente para acertar dia, horário e número de pessoas.",
    "groupsMessage": "Olá! Gostaria de informações sobre reserva para grupos e eventos.",
    "practicalTitle": "Como está o salão",
    "addressLabel": "Endereço",
    "hoursLabel": "Horário",
    "salaoEarlyLabel": "11h",
    "salaoEarlyValue": "Buffet intacto, comida recém-saída do fogo e muita tranquilidade. O paraíso de quem almoça cedo.",
    "salaoPeakLabel": "Das 12h às 13h30",
    "salaoPeakValue": "O fluxo intenso do Centro. Mas fica tranquilo: a rotatividade é alta e a chapa não para.",
    "salaoLateLabel": "A partir das 13h30",
    "salaoLateValue": "Clima mais calmo, ideal para comer sem pressa, com reposição garantida no buffet."
  },
```

- [ ] **Step 2: Publicar a grade de horários na página**

Em `src/app/[locale]/(marketing)/reservas/page.tsx`, trocar o import de config:

```ts
import { fullAddress, openingHoursLabel, siteConfig } from "@/config/site";
```

Depois, dentro de `ReservasPage`, substituir

```tsx
  const { openingHours } = siteConfig;
```

por

```tsx
  const hours = openingHoursLabel();
```

E substituir o bloco inteiro da seção "Informações práticas" —

```tsx
      {/* 5.3 — Informações práticas */}
      <Section>
        <SectionHeader title={t("practicalTitle")} align="left" />
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <Fact icon={MapPin} label={t("addressLabel")} value={fullAddress()} />
        </div>
        {openingHours ? (
          <p className="sr-only">
            {`${openingHours.opens.replace(":00", "h")} às ${openingHours.closes.replace(":00", "h")}`}
          </p>
        ) : null}
      </Section>
```

— por:

```tsx
      {/* 5.3 — Como está o salão ao longo do serviço */}
      <Section>
        <SectionHeader title={t("practicalTitle")} align="left" />
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {/* `openingHoursLabel` já inclui os dias — ver o aviso na função. */}
          {hours ? (
            <Fact icon={Clock} label={t("hoursLabel")} value={hours} />
          ) : null}
          <Fact icon={MapPin} label={t("addressLabel")} value={fullAddress()} />
          <Fact
            icon={Clock}
            label={t("salaoEarlyLabel")}
            value={t("salaoEarlyValue")}
          />
          <Fact
            icon={Clock}
            label={t("salaoPeakLabel")}
            value={t("salaoPeakValue")}
          />
          <Fact
            icon={Clock}
            label={t("salaoLateLabel")}
            value={t("salaoLateValue")}
          />
        </div>
      </Section>
```

Se o import de `siteConfig` ficar sem uso, o `npm run lint` vai apontar — nesse
caso remova-o do import.

- [ ] **Step 3: Validar**

```bash
npm run typecheck && npm run lint && npm test
```

Esperado: os três passam.

- [ ] **Step 4: Conferir na tela**

```bash
npm run dev
```

Abrir `http://localhost:3000/reservas` e confirmar:

1. o item de menu no cabeçalho diz **"Horários"**, não "Horários & Reservas";
2. o H1 é "Horários" e o subtítulo diz "De segunda a sexta, das 11h às 15h.";
3. a seção "Como está o salão" mostra **cinco** cartões: Horário, Endereço, 11h,
   Das 12h às 13h30, A partir das 13h30;
4. o cartão "Horário" diz "Seg a sex, das 11h às 15h" — com os dias;
5. a seção "Reservas para grupos e eventos" continua lá e o botão de WhatsApp
   funciona.

Encerrar com Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add src/messages/pt.json "src/app/[locale]/(marketing)/reservas/page.tsx"
git commit -m "$(cat <<'EOF'
UPD: /reservas passa a liderar com o horario

O documento do cliente nao tem pagina de reservas -- o menu dele e
[INICIO] [A EXPERIENCIA] [NOSSA GASTRONOMIA] [HORARIOS] [CONTATO]. Mas o
dado confirmado diz que a casa aceita reserva, e ela e o unico mecanismo
de conversao do site.

Reconciliacao: a rota e acceptsReservations continuam; o rotulo vira
"Horarios", o H1 e o subtitulo passam a ser o horario, e a reserva
sobrevive na secao de grupos e eventos, que ja existia.

O Fact e o icone Clock estavam importados sem uso desde o PR 1,
esperando o horario. Agora a grade mostra o horario e os tres momentos
do servico.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: `/gastronomia` — copy nova, e o fechamento vira componente

**Files:**
- Create: `src/components/sections/closing-cta.tsx`
- Modify: `src/messages/pt.json` (namespace `gastronomia`)
- Modify: `src/app/[locale]/(marketing)/gastronomia/page.tsx`
- Modify: `src/components/sections/cta.tsx`
- Modify: `src/app/[locale]/(marketing)/experiencia/page.tsx`

**Interfaces:**
- Consumes: nada de tasks anteriores
- Produces: `ClosingCta` — componente exportado de
  `src/components/sections/closing-cta.tsx`, com a assinatura
  `{ title: string; children?: ReactNode; actions: ReactNode; footer?: ReactNode }`

**Contexto que o implementador precisa:** `/gastronomia` hoje termina seca —
renderiza o `PageHeader` e as categorias do banco, e acabou.
`gastronomia.ctaTitle` e `gastronomia.ctaButton` existem no catálogo mas
**nenhum componente as consome**. Esta task religa esse fechamento.

O bloco de fechamento (card na cor da marca, blob de blur, título centralizado,
fileira de botões) já está **duplicado** em `src/components/sections/cta.tsx` e
em `src/app/[locale]/(marketing)/experiencia/page.tsx:91-131`. Em vez de fazer a
terceira cópia, esta task **extrai o componente** e converte os três chamadores.

Isso não é limpeza gratuita: a paleta do cliente ainda não chegou. Quando chegar
(PR 2), a troca precisa acontecer num lugar só, não em três.

⚠️ **Uma diferença visual consciente.** Os dois blocos existentes divergem: em
`cta.tsx` o `text-center` está no `Reveal` e o parágrafo tem `max-w-xl`; em
`/experiencia` o `text-center` está num `div` interno com `mx-auto max-w-2xl`. O
componente normaliza para a estrutura de `/experiencia`, então **o subtítulo do
CTA da home fica um pouco mais largo** (`max-w-xl` → `max-w-2xl`). É a única
mudança visual desta task, e é intencional. Não tente preservar as duas variantes
com uma prop.

- [ ] **Step 1: Criar o componente**

Criar `src/components/sections/closing-cta.tsx`:

```tsx
import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

/**
 * O card de fechamento na cor da marca: título, corpo e uma fileira de ações.
 *
 * Existe porque o mesmo bloco estava copiado em `sections/cta.tsx` e em
 * `/experiencia`, e `/gastronomia` seria a terceira cópia. O motivo prático de
 * unificar agora é o PR 2: a paleta do cliente ainda não chegou, e quando
 * chegar a troca precisa acontecer num lugar só.
 *
 * `footer` existe para o disclaimer de `/experiencia`, que fica dentro do
 * `Container` mas **fora** do card colorido.
 */
export function ClosingCta({
  title,
  children,
  actions,
  footer,
}: {
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="py-20 sm:py-section">
      <Container>
        <Reveal className="relative overflow-hidden rounded-2xl bg-brand px-6 py-16 text-brand-foreground sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h2>
            {children ? <div className="mt-5">{children}</div> : null}
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              {actions}
            </div>
          </div>
        </Reveal>
        {footer}
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Converter o CTA da home**

Substituir `src/components/sections/cta.tsx` inteiro por:

```tsx
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ClosingCta } from "@/components/sections/closing-cta";
import { ReserveButton } from "@/components/reserve-button";

export async function CTA() {
  const t = await getTranslations("home.cta");

  return (
    <ClosingCta
      title={t("title")}
      actions={
        <>
          <Link
            href="/reservas"
            className={buttonVariants({
              variant: "accent",
              size: "lg",
              className: "group",
            })}
          >
            {t("button")}
            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <ReserveButton
            variant="outline"
            size="lg"
            className="border-white/40 text-brand-foreground hover:bg-white/10"
          />
        </>
      }
    >
      <p className="text-pretty opacity-90">{t("subtitle")}</p>
    </ClosingCta>
  );
}
```

- [ ] **Step 3: Converter o fechamento de `/experiencia`**

Em `src/app/[locale]/(marketing)/experiencia/page.tsx`, substituir o bloco que
vai de `<section className="py-20 sm:py-section">` até o `</section>` que fecha
esse mesmo bloco (o fechamento com o `contactCta`, terminando depois do
parágrafo de `disclaimer`) por:

```tsx
      <ClosingCta
        title={t("contactCta.title")}
        actions={
          <>
            <Link
              href="/contato"
              className={buttonVariants({
                variant: "accent",
                size: "lg",
                className: "group",
              })}
            >
              {tc("talkToUs")}
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <ReserveButton
              variant="outline"
              size="lg"
              className="border-white/40 text-brand-foreground hover:bg-white/10"
              label={tc("reserveTable")}
            />
          </>
        }
        footer={
          <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
            {t("disclaimer")}
          </p>
        }
      >
        <div className="flex flex-col gap-3">
          {contactParagraphs.map((p, i) => (
            <p key={i} className="text-pretty leading-relaxed opacity-90">
              {p}
            </p>
          ))}
        </div>
      </ClosingCta>
```

E adicionar o import:

```tsx
import { ClosingCta } from "@/components/sections/closing-cta";
```

Se `Container` ou `Reveal` ficarem sem uso no arquivo depois disso, o
`npm run lint` aponta — remova os imports órfãos.

- [ ] **Step 4: Reescrever o namespace `gastronomia`**

Em `src/messages/pt.json`, substituir o objeto `gastronomia` inteiro por:

```json
  "gastronomia": {
    "title": "Nossa Gastronomia",
    "subtitle": "Comida de verdade, churrasco na brasa e tempero caseiro.",
    "empty": "Em breve, o cardápio completo por aqui.",
    "ctaTitle": "Qualidade, fartura e agilidade para a sua pausa.",
    "ctaSubtitle": "O buffet já está servido a partir das 11h. Chegue cedo e aproveite.",
    "ctaButton": "Ver os horários",
    "weekOfTitle": "Pratos da semana",
    "weekday1": "Segunda",
    "weekday2": "Terça",
    "weekday3": "Quarta",
    "weekday4": "Quinta",
    "weekday5": "Sexta"
  },
```

Duas observações sobre o que saiu e o que ficou:

- **`viewAll` sai** — o objeto acima não o contém. Ele estava morto: só
  `common.viewAllMenu` e `common.viewAllGallery` são consumidos, por
  `src/components/sections/menu-preview.tsx:32` e `gallery-preview.tsx:31`.
- **`weekOfTitle` e os `weekday*` ficam** — são consumidos por
  `src/components/menu-item-card.tsx`. Não apagar.

- [ ] **Step 5: Religar o fechamento de `/gastronomia`**

Em `src/app/[locale]/(marketing)/gastronomia/page.tsx`, trocar os imports do
topo por:

```tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/page-header";
import { MenuItemCard } from "@/components/menu-item-card";
import { ClosingCta } from "@/components/sections/closing-cta";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/ui/section";
import { getMenu } from "@/lib/queries";
import { resolveLocale } from "@/i18n/routing";
import { localeMetadata } from "@/lib/seo";
```

E, no `return`, inserir o fechamento logo **antes** do `</>` final — isto é,
depois do bloco `{categories.length === 0 ? … : …}`:

```tsx
      {/* Quem terminou de ler o cardápio quer saber a que horas pode vir, não
          reservar mesa. A conversão por WhatsApp continua no `WhatsappButton`
          flutuante do layout de marketing, presente em toda página. */}
      <ClosingCta
        title={t("ctaTitle")}
        actions={
          <Link
            href="/reservas"
            className={buttonVariants({
              variant: "accent",
              size: "lg",
              className: "group",
            })}
          >
            {t("ctaButton")}
            <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        }
      >
        <p className="text-pretty opacity-90">{t("ctaSubtitle")}</p>
      </ClosingCta>
```

- [ ] **Step 6: Validar**

```bash
npm run typecheck && npm run lint && npm test
```

Esperado: os três passam.

- [ ] **Step 7: Conferir as três páginas na tela**

Esta task mexeu em três telas — conferir as três, não só a nova.

```bash
npm run dev
```

1. `http://localhost:3000/gastronomia` — o subtítulo é "Comida de verdade,
   churrasco na brasa e tempero caseiro."; no fim da página existe o card na cor
   da marca com "Qualidade, fartura e agilidade para a sua pausa." e o botão
   "Ver os horários" levando para `/reservas`. O card aparece **mesmo com o
   cardápio vazio** — ele fica fora do condicional de `categories.length`.
2. `http://localhost:3000` — o card de fechamento continua com os **dois**
   botões ("Veja nossos horários" e o de WhatsApp) e continua idêntico ao que
   era, exceto pelo subtítulo um pouco mais largo (mudança consciente).
3. `http://localhost:3000/experiencia` — o card de fechamento continua com os
   dois botões, e o parágrafo de disclaimer continua **abaixo e fora** do card
   colorido, centralizado e em texto pequeno.

Encerrar com Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add src/messages/pt.json src/components/sections/closing-cta.tsx src/components/sections/cta.tsx "src/app/[locale]/(marketing)/gastronomia/page.tsx" "src/app/[locale]/(marketing)/experiencia/page.tsx"
git commit -m "$(cat <<'EOF'
UPD: /gastronomia recupera o fechamento, que vira componente

A varredura do catalogo mostrou que gastronomia.ctaTitle e ctaButton
existiam sem nenhum componente consumindo -- a pagina terminava seca,
sem passo seguinte para quem acabou de ler o cardapio.

O bloco de fechamento ja estava copiado em sections/cta.tsx e em
/experiencia; /gastronomia seria a terceira copia. Vira ClosingCta, com
props de titulo, corpo e acoes. O motivo pratico e o PR 2: quando a
paleta do cliente chegar, a troca acontece num lugar so.

Uma mudanca visual consciente: os dois blocos divergiam, e o componente
normaliza para a estrutura de /experiencia -- o subtitulo do CTA da home
fica um pouco mais largo.

O botao de /gastronomia leva para /reservas: quem leu o cardapio quer
saber a que horas pode vir. A conversao por WhatsApp continua no botao
flutuante do layout.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `/contato`

**Files:**
- Modify: `src/messages/pt.json` (namespace `contact`)

**Interfaces:**
- Consumes: `contact.labels.instagram` da Task 2
- Produces: nada consumido por tasks posteriores

⚠️ `contact.subtitle` **não muda** — é o endereço, congelado pela constraint
global.

- [ ] **Step 1: Ajustar o título e o placeholder do formulário**

Em `src/messages/pt.json`, dentro de `contact`, trocar

```json
    "title": "Estamos no Centro de Santos",
```

por

```json
    "title": "A poucos passos de você no Centro",
```

e, dentro de `contact.form`, trocar

```json
      "messagePlaceholder": "Conte o que você precisa — reserva, evento, dúvida…",
```

por

```json
      "messagePlaceholder": "Conte o que você precisa — grupo, evento, dúvida…",
```

- [ ] **Step 2: Validar**

```bash
npm run typecheck && npm run lint && npm test
```

Esperado: os três passam.

- [ ] **Step 3: Conferir na tela**

```bash
npm run dev
```

Abrir `http://localhost:3000/contato` e confirmar que o H1 é "A poucos passos de
você no Centro", que o subtítulo continua sendo o endereço com o número **25**, e
que o Instagram aparece na lista lateral. Encerrar com Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/messages/pt.json
git commit -m "$(cat <<'EOF'
UPD: /contato adota o tom do documento do cliente

O H1 vira "A poucos passos de voce no Centro" (o documento diz "Centro
Historico"; o dado confirmado e o CEP dizem Centro, e Centro Historico
era o posicionamento do cliente anterior deste fork).

O endereco nao muda: continua no numero 25 ate o cliente confirmar a
divergencia do documento.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: A cafeteria sai da copy

**Files:**
- Modify: `src/messages/pt.json` (`metadata`, `footer.tagline`)
- Modify: `src/app/llms.txt/route.ts:48` e a linha de `/reservas`
- Modify: `src/app/llms-full.txt/route.ts:80`
- Modify: `src/app/manifest.ts:8`
- Modify: `src/app/[locale]/opengraph-image.tsx:45`

**Interfaces:**
- Consumes: nada de tasks anteriores
- Produces: nada consumido por tasks posteriores

**Contexto que o implementador precisa:** o dado confirmado descreve
"restaurante **e** cafeteria", mas o documento de copy do cliente não menciona
café uma única vez — é integralmente buffet, churrasco e almoço. A decisão do
projeto é tirar a cafeteria da **copy do site**. A razão social
`PRATO COFFEE SHOP REFEICOES LTDA` continua em `src/config/site.ts` e em
`src/content/legal.ts`, porque lá é registro, não posicionamento — **não tocar
nesses dois arquivos nesta task**.

- [ ] **Step 1: Ajustar metadata e rodapé**

Em `src/messages/pt.json`, substituir o objeto `metadata` inteiro por:

```json
  "metadata": {
    "defaultTitle": "{brand} | Almoço, buffet e churrasco no Centro de Santos",
    "titleTemplate": "%s · {brand}",
    "description": "Buffet completo e churrasco na brasa no Centro de Santos, na R. Augusto Severo, 25. De segunda a sexta, das 11h às 15h. Desde 1998.",
    "keywords": "almoço centro de santos, buffet centro de santos, churrasco centro de santos, restaurante centro de santos, onde almoçar no centro de santos"
  },
```

E, dentro de `footer`, trocar

```json
    "tagline": "Restaurante e cafeteria no Centro de Santos.",
```

por

```json
    "tagline": "A sua melhor e mais saborosa pausa do dia.",
```

⚠️ O trecho "na R. Augusto Severo, 25" da `description` é **preservado**, não
alterado — mas registre que este é um quarto lugar acoplado ao número, junto com
`site.ts`, `legal.ts` e `experiencia.disclaimer`. Se o cliente confirmar "09", os
quatro mudam juntos.

- [ ] **Step 2: Ajustar o `llms.txt`**

Em `src/app/llms.txt/route.ts`, trocar

```ts
    `> Restaurante e cafeteria no Centro de Santos — ${fullAddress()}.${hours}`,
```

por

```ts
    `> Buffet completo e churrasco na brasa no Centro de Santos — ${fullAddress()}.${hours}`,
```

e, no array `core`, trocar

```ts
    line("Horários & Reservas", "/reservas", "Reservas e informações práticas"),
```

por

```ts
    line("Horários", "/reservas", "Horário de funcionamento e informações práticas"),
```

- [ ] **Step 3: Ajustar o `llms-full.txt`**

Em `src/app/llms-full.txt/route.ts`, na linha 80, trocar

```ts
    `> Restaurante e cafeteria no Centro de Santos — ${fullAddress()}.`,
```

por

```ts
    `> Buffet completo e churrasco na brasa no Centro de Santos — ${fullAddress()}.`,
```

- [ ] **Step 4: Ajustar o manifest**

Em `src/app/manifest.ts`, na linha 8, trocar

```ts
    description: `Restaurante e cafeteria no Centro de ${siteConfig.contact.address.city}`,
```

por

```ts
    description: `Almoço, buffet e churrasco no Centro de ${siteConfig.contact.address.city}`,
```

- [ ] **Step 5: Ajustar a imagem OG**

Em `src/app/[locale]/opengraph-image.tsx`, na linha 45, trocar

```tsx
          Restaurante e cafeteria no Centro de {city}/{region}
```

por

```tsx
          Buffet e churrasco no Centro de {city}/{region}
```

- [ ] **Step 6: Confirmar que não sobrou "cafeteria" na copy**

```bash
grep -rn "afeteria" src --include=*.ts --include=*.tsx --include=*.json
```

Esperado: **nenhuma saída**. Se aparecer alguma linha em `src/content/legal.ts`
ou `src/config/site.ts` referente à razão social `PRATO COFFEE SHOP`, ela é
legítima e não deve ser tocada — mas a palavra "cafeteria" em si não deve
sobrar em lugar nenhum.

- [ ] **Step 7: Validar**

```bash
npm run typecheck && npm run lint && npm test
```

Esperado: os três passam.

- [ ] **Step 8: Conferir na tela**

```bash
npm run dev
```

Conferir:

1. `http://localhost:3000/llms.txt` — a linha de citação começa com "Buffet
   completo e churrasco na brasa" e termina com "Seg a sex, das 11h às 15h.";
   e a lista de páginas diz "Horários", não "Horários & Reservas";
2. `http://localhost:3000/llms-full.txt` — mesma linha de citação;
3. `http://localhost:3000/manifest.webmanifest` — a `description` não menciona
   cafeteria;
4. `http://localhost:3000` — o rodapé diz "A sua melhor e mais saborosa pausa do
   dia." e a aba do navegador diz "Restaurante Prato | Almoço, buffet e
   churrasco no Centro de Santos".

Encerrar com Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add src/messages/pt.json src/app/llms.txt/route.ts src/app/llms-full.txt/route.ts src/app/manifest.ts "src/app/[locale]/opengraph-image.tsx"
git commit -m "$(cat <<'EOF'
RMV: a cafeteria sai da copy do site

O dado confirmado descreve "restaurante e cafeteria", mas o documento de
copy do cliente nao menciona cafe uma unica vez -- e integralmente
buffet, churrasco e almoco. A copy passa a dizer o que o cliente diz.

A palavra estava hardcoded em quatro arquivos fora do catalogo, alem do
proprio pt.json. A razao social PRATO COFFEE SHOP REFEICOES continua em
site.ts e legal.ts: la e registro, nao posicionamento.

O llms.txt tambem para de chamar /reservas de "Horarios & Reservas".

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Apagar as sete chaves mortas restantes

**Files:**
- Modify: `src/messages/pt.json`

**Interfaces:**
- Consumes: nada
- Produces: nada

**Contexto que o implementador precisa:** varrendo as 382 chaves folha do
catálogo contra `src/`, dez não eram consumidas por componente nenhum:

- duas (`gastronomia.ctaTitle`, `gastronomia.ctaButton`) foram **religadas** na
  Task 7 e ficam;
- uma (`gastronomia.viewAll`) já saiu na Task 7, junto com a reescrita do
  namespace;
- **sobram sete**, que esta task apaga.

⚠️ **NÃO apagar `admin.whatsapp.state_connecting` nem
`admin.whatsapp.state_close`.** Uma varredura automática as marca como mortas,
mas elas são montadas dinamicamente em
`src/components/admin/whatsapp-manager.tsx:210` com
``t(`state_${state}` as "state_open")``. Apagá-las quebraria o painel de WhatsApp
em runtime, **sem** erro de tipo para avisar.

- [ ] **Step 1: Apagar as sete chaves**

Em `src/messages/pt.json`, remover exatamente estas linhas:

| Namespace | Chave a remover |
|---|---|
| `common` | `"learnMore": "Saiba mais",` |
| `common` | `"backHome": "Voltar para o início",` |
| `galeria` | `"ctaTitle": "Quer ver de perto?",` |
| `galeria` | `"ctaButton": "Fazer minha reserva"` |
| `novidades` | `"viewAll": "Ver todas as novidades",` |
| `novidades` | `"menuTitle": "Novidades",` |
| `admin.leads` | `"receivedAt": "Recebido em",` |

`novidades.viewAll` está morta pelo mesmo motivo que a de `gastronomia`: quem
faz o trabalho são `common.viewAllMenu` e `common.viewAllGallery`, em
`src/components/sections/menu-preview.tsx:32` e `gallery-preview.tsx:31`.

⚠️ Cuidado com a vírgula: `galeria.ctaButton` é a **última** chave do objeto
`galeria`, então ao removê-la a chave anterior (`photoAlt`) não pode ficar com
vírgula sobrando. O Step 2 pega isso.

- [ ] **Step 2: Confirmar que o JSON continua válido**

```bash
node -e "JSON.parse(require('fs').readFileSync('src/messages/pt.json','utf8')); console.log('JSON valido')"
```

Esperado: `JSON valido`.

- [ ] **Step 3: Validar**

```bash
npm run typecheck && npm run lint && npm test
```

Esperado: os três passam. O typecheck é o que garante que nenhuma chave
removida ainda era referenciada — o catálogo é tipado.

- [ ] **Step 4: Conferir que o painel de WhatsApp não quebrou**

```bash
npm run dev
```

Abrir `http://localhost:3000/admin`, entrar, e abrir o painel de WhatsApp.
Confirmar que o estado da instância aparece com rótulo em texto (e não como
chave crua tipo `state_close`). Encerrar com Ctrl+C.

Se não houver credencial de admin local, pule este passo e registre no relatório
que ele não foi executado — não invente que passou.

- [ ] **Step 5: Commit**

```bash
git add src/messages/pt.json
git commit -m "$(cat <<'EOF'
RMV: apaga as sete chaves mortas restantes do catalogo

Varrendo as 382 chaves folha contra src/, dez nao eram consumidas por
componente nenhum. Duas eram o fechamento de /gastronomia, religado em
vez de apagado, e uma ja saiu com a reescrita daquele namespace.
Sobraram sete.

state_connecting e state_close ficam: a varredura as acusa, mas sao
montadas dinamicamente em whatsapp-manager.tsx e apaga-las quebraria o
painel em runtime sem erro de tipo.

O pt.json ja regrediu duas vezes neste repo, a segunda derrubando deploy,
CI e E2E juntos. Chave morta num catalogo desse tamanho e ruido que
esconde a proxima regressao.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Atualizar a documentação

**Files:**
- Modify: `docs/WHITELABEL-RESTAURANTE-PRATO.md`
- Modify: `docs/superpowers/specs/2026-08-17-whitelabel-restaurante-prato-design.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: tudo das tasks 1–10
- Produces: nada

**Contexto que o implementador precisa:** três documentos afirmam hoje que o
horário, o Instagram e o tipo de cozinha estão pendentes. Depois deste plano,
não estão. Documento que mente sobre o estado do repo é pior que documento
ausente — a próxima pessoa vai reabrir uma pendência já fechada.

E há uma correção mais séria: **"restaurante e cafeteria" está registrado como
dado confirmado** em três documentos. O cliente corrigiu em 19/08 — é
restaurante, e o Fogão de Ouro (restaurante de almoço) é a base correta. Uma
linha de dado confirmado errada é pior que uma pendência: ela é copiada adiante
sem ninguém reconferir.

⚠️ A razão social `PRATO COFFEE SHOP REFEICOES LTDA` **não muda em lugar
nenhum** — é registro na Receita, não descrição do negócio.

- [ ] **Step 1: Corrigir a natureza do negócio e atualizar os dados confirmados**

Em `docs/WHITELABEL-RESTAURANTE-PRATO.md`, na linha 5, trocar

```markdown
Ele está sendo re-skinado para o **Restaurante Prato**, restaurante e cafeteria
na R. Augusto Severo, 25, no Centro de Santos/SP.
```

por

```markdown
Ele está sendo re-skinado para o **Restaurante Prato**, restaurante na
R. Augusto Severo, 25, no Centro de Santos/SP.
```

Na tabela "Dados confirmados", substituir a linha de Natureza

```markdown
| Natureza | Restaurante **e** cafeteria; aceita reserva |
```

por

```markdown
| Natureza | Restaurante de almoço — buffet e churrasco na brasa; aceita reserva. **Não é cafeteria** *(corrigido em 19/08/2026)*. A razão social diz "Coffee Shop", mas isso é registro, não posicionamento |
```

e adicionar três linhas no fim da mesma tabela:

```markdown
| Horário | Segunda a sexta, das 11h às 15h *(19/08/2026)* |
| Instagram | [@restaurante.prato](https://instagram.com/restaurante.prato) *(19/08/2026)* |
| Cozinha | Brasileira, churrasco *(19/08/2026)* |
```

- [ ] **Step 2: Atualizar a tabela de pendências**

No mesmo arquivo, na tabela "Pendências", **remover** as linhas de "Horário de
funcionamento", "Tipo de cozinha" e "Instagram / Facebook", e **substituir** a
linha de "Copy definitiva" por:

```markdown
| Copy definitiva | ✅ Entregue em 19/08 e aplicada. O documento diverge do endereço confirmado (diz 09, o confirmado é 25) — ver a linha abaixo |
| **Número do endereço** | O documento de copy diz "Rua Augusto Severo, 09"; o dado confirmado em 17/08 e o CNPJ dizem **25**. Mantido 25 até o cliente responder. Acoplado a quatro lugares: `src/config/site.ts`, `src/content/legal.ts`, `metadata.description` e `experiencia.disclaimer` |
| Facebook | `social` só tem Instagram; o `sameAs` sai com um item |
```

- [ ] **Step 3: Atualizar a sequência de PRs**

No mesmo arquivo, na seção "Sequência de PRs", marcar o PR 3 e apontar o spec:

```markdown
3. **PR 3 — copy e conteúdo** ✅ parcialmente (este plano:
   [`superpowers/plans/2026-08-19-copy-e-tom-de-voz-prato.md`](superpowers/plans/2026-08-19-copy-e-tom-de-voz-prato.md),
   spec [`superpowers/specs/2026-08-19-copy-e-tom-de-voz-prato-design.md`](superpowers/specs/2026-08-19-copy-e-tom-de-voz-prato-design.md)):
   copy definitiva, tom de voz, horário, Instagram e tipo de cozinha.
   **Falta:** fotos do hero e da galeria, cardápio e depoimentos pelo admin.
```

- [ ] **Step 4: Fechar as perguntas resolvidas no spec do rebrand**

Em `docs/superpowers/specs/2026-08-17-whitelabel-restaurante-prato-design.md`,
corrigir primeiro a linha de Natureza da tabela de dados confirmados (linha 42):

```markdown
| Natureza | restaurante de almoço — buffet e churrasco; aceita reserva. **Não é cafeteria** *(corrigido em 19/08/2026)* | mantém `/reservas` e `acceptsReservations` |
```

E na linha 15, trocar a menção a "Coffee Shop" na frase de abertura por uma que
não confunda razão social com posicionamento:

```markdown
Coffee Shop na razão social, no Centro de Santos/SP — mas o negócio é um
restaurante de almoço, não uma cafeteria (corrigido em 19/08/2026).
```

Depois, na seção `### 4.1.1 Resolvidas em 17/08/2026`, acrescentar ao fim:

```markdown

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
```

- [ ] **Step 5: Atualizar o AGENTS.md**

Em `AGENTS.md`, na linha 9, trocar

```markdown
**This is the site of the Restaurante Prato**, a restaurant and coffee shop at
```

por

```markdown
**This is the site of the Restaurante Prato**, a lunch restaurant at
```

⚠️ Não trocar por "a restaurant and cafeteria" nem reintroduzir "coffee shop"
mais adiante. A razão social carrega "Coffee Shop", mas o negócio é um
restaurante de almoço — buffet e churrasco na brasa — e é o Fogão de Ouro,
também restaurante de almoço, que serve de base estrutural.

Depois, localizar o parágrafo que começa com **"Phone, opening hours and
cuisine are optional on purpose."** e substituí-lo por:

```markdown
**Phone is optional on purpose — hours and cuisine are now known.** The Prato has
no landline, so `contact.phone` stays optional and currently omitted, and every
call CTA disappears on its own. `openingHours` (Mon–Fri 11:00–15:00) and
`servesCuisine` (Brasileira, Churrasco) were confirmed on 19/08/2026 and are now
published — but they stay **optional in the type**, because the degradation they
buy is real and was expensive to build. Don't make them required.

⚠️ **Never format opening hours by hand.** Call `openingHoursLabel()` from
`config/site.ts`. Two consumers used to build the line from `opens`/`closes`
alone and rendered "Aberto das 11h às 15h" — which tells the reader the place
opens on Saturday. The helper always includes the day range.
```

- [ ] **Step 6: Confirmar que a guarda de marca continua verde**

`AGENTS.md` é varrido por `test/brand-hygiene.test.ts`.

```bash
npm test -- test/brand-hygiene.test.ts
```

Esperado: PASS.

- [ ] **Step 7: Validação final do plano inteiro**

```bash
npm run typecheck && npm run lint && npm run build && npm test
```

Esperado: os quatro passam. O `build` é o que valida a imagem OG e as rotas de
texto de verdade.

- [ ] **Step 8: Commit**

```bash
git add docs/WHITELABEL-RESTAURANTE-PRATO.md "docs/superpowers/specs/2026-08-17-whitelabel-restaurante-prato-design.md" AGENTS.md
git commit -m "$(cat <<'EOF'
docs: horario, Instagram e cozinha saem da lista de pendencias

Tres documentos afirmavam que esses dados estavam pendentes. Depois
deste PR nao estao, e documento que mente sobre o estado do repo faz a
proxima pessoa reabrir pendencia ja fechada.

Entra no lugar uma pendencia nova e mais delicada: o numero do endereco,
que o documento de copy do cliente diz ser 09 contra os 25 confirmados
em 17/08. Fica registrado a que quatro lugares ele esta acoplado.

O AGENTS.md ganha o aviso de nunca formatar horario a mao.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Fora deste plano

Registrado para não virar surpresa depois:

- **O número do endereço** (09 vs 25) espera o cliente. Quatro lugares mudam
  juntos quando a resposta chegar.
- **Depoimentos** precisam ser avaliações reais do Google, com `source` e
  `sourceUrl`, cadastradas pelo admin. Nunca inventar, e **nunca** ligar ao
  `Restaurant` JSON-LD.
- **Cardápio e fotos** (hero e galeria) entram pelo admin, não pelo código.
- **Paleta e logo** são o PR 2 e continuam travados.
- **Preço no cardápio** continua pergunta aberta desde o spec do rebrand.
- **Seções que o documento pede e não foram construídas:** faixa de destaques e
  teaser na home, grade de blocos em `/gastronomia`. Registradas em §8 do spec.
