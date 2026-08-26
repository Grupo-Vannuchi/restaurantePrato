import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createTranslator } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import messages from "@/messages/pt.json";
import { richTags } from "@/i18n/rich";
import { siteConfig } from "@/config/site";

/**
 * Regressão do bug em `/experiencia`: a mensagem `experiencia.lead` tem o
 * placeholder ICU `{foundedYear}`, mas a página chamava `t.rich("lead",
 * richTags)` — só os renderizadores de `<b>`/`<i>`, nunca um valor. Sem
 * `foundedYear`, o next-intl não lança exceção (que quebraria o build):
 * ele cai no `getMessageFallback` padrão, que devolve a própria chave
 * (`"experiencia.lead"`). É por isso que o bug só aparece olhando a página
 * renderizada, e não em `npm run typecheck` nem `npm run build` — os dois
 * passam mesmo com o placeholder faltando.
 *
 * O teste usa `createTranslator`, o mesmo motor de formatação por trás de
 * `useTranslations`/`getTranslations`, com o catálogo pt.json de verdade —
 * não um mock — para reproduzir exatamente a chamada de `page.tsx`. A página
 * em si é um Server Component assíncrono (usa `getTranslations`, que depende
 * de contexto de requisição do Next); renderizá-la neste setup Vitest/jsdom
 * não é prático, então o teste exercita a formatação real sem passar pelo
 * componente.
 */
describe("experiencia.lead (t.rich com placeholder ICU)", () => {
  const t = createTranslator({
    locale: "pt",
    messages,
    namespace: "experiencia",
    // O fallback em si já é a asserção abaixo; sem isto o teste também
    // imprimiria o console.error padrão do next-intl no caso "sem valor".
    onError: () => {},
  });

  it("page.tsx continua passando foundedYear para t.rich(\"lead\", ...)", () => {
    // Os dois testes abaixo reconstroem a chamada certa e provam que ELA
    // resolve corretamente — mas não leem `page.tsx`, então não pegariam uma
    // regressão que revertesse a correção lá (voltar a chamar só com
    // `richTags`). Este teste lê o arquivo de verdade para fechar essa
    // lacuna, no mesmo estilo de varredura textual do `brand-hygiene.test.ts`.
    const source = readFileSync(
      join(
        process.cwd(),
        "src/app/[locale]/(marketing)/experiencia/page.tsx",
      ),
      "utf8",
    );
    const callIndex = source.indexOf('t.rich("lead"');
    expect(callIndex, 'chamada t.rich("lead", ...) não encontrada em page.tsx').toBeGreaterThan(-1);
    const call = source.slice(callIndex, source.indexOf(")", callIndex) + 1);
    expect(call).toContain("foundedYear");
  });

  it("com foundedYear (a chamada correta), resolve o parágrafo de verdade", () => {
    const html = renderToStaticMarkup(
      <>{t.rich("lead", { ...richTags, foundedYear: siteConfig.foundedYear })}</>,
    );
    expect(html).toContain(`desde ${siteConfig.foundedYear}.`);
    expect(html).not.toContain("experiencia.lead");
  });

  it("sem foundedYear (a chamada quebrada), cai no fallback — era exatamente o bug", () => {
    const html = renderToStaticMarkup(<>{t.rich("lead", richTags)}</>);
    expect(html).toBe("experiencia.lead");
  });
});

/**
 * Varredura estática de toda a classe de bug: qualquer mensagem do catálogo
 * com um placeholder ICU (`{algo}`) exige que quem chama `t(...)`/`t.rich(...)`
 * passe aquele valor — do contrário cai no mesmo fallback silencioso acima.
 *
 * `ALLOWED` é a lista de toda mensagem com placeholder cujo(s) call site(s)
 * foram conferidos manualmente em 19/08/2026 (ver relatório da task) — cada
 * uma tem seu valor passado no namespace certo. Isto NÃO prova que o call
 * site continua correto (não interpreta código-fonte), mas prova que o
 * inventário de placeholders do catálogo não mudou sem revisão: se uma
 * mensagem existente ganha/perde um placeholder, ou uma mensagem nova nasce
 * com um, o teste falha e força achar quem chama aquela chave antes de
 * atualizar a lista.
 *
 * Não confundir com `{years}`: é um token à parte, substituído por
 * `fillYears()` via `.replaceAll` em texto lido com `t.raw()` — nunca passa
 * pelo formatador ICU do next-intl, então não entra nesta varredura (ver
 * `src/config/site.ts`). Hoje só `home.hero.eyebrow` usa `{years}` como
 * placeholder ICU de verdade (lido com `t()`, não `t.raw()`).
 */
const ALLOWED: Record<string, string[]> = {
  "metadata.defaultTitle": ["brand"],
  "metadata.titleTemplate": ["brand"],
  "common.callUs": ["phone"],
  "home.hero.eyebrow": ["years"],
  "home.hero.goToSlide": ["n"],
  "experiencia.lead": ["foundedYear"],
  "novidades.imageCaption": ["title"],
  "novidades.regionsTitle": ["title"],
  "footer.registration": ["value"],
  "theme.toggle": ["mode"],
  "admin.dashboard.welcome": ["name"],
  "admin.leads.removeTag": ["tag"],
  "admin.novidades.editTitle": ["title"],
  "admin.novidades.deleteConfirm": ["title"],
  "admin.novidades.sectionContent": ["locale"],
  "admin.cardapio.sectionContent": ["locale"],
  "admin.cardapio.editCategoryTitle": ["name"],
  "admin.cardapio.editItemTitle": ["name"],
  "admin.cardapio.deleteCategoryConfirm": ["name"],
  "admin.cardapio.deleteItemConfirm": ["name"],
  "admin.galeria.sectionContent": ["locale"],
  "admin.testimonials.editTitle": ["name"],
  "admin.testimonials.deleteConfirm": ["name"],
  "admin.testimonials.stars": ["count"],
  "admin.testimonials.sectionContent": ["locale"],
  "admin.whatsapp.confirmLogout": ["name"],
  "admin.whatsapp.confirmDelete": ["name"],
  "admin.whatsapp.scanHint": ["name"],
  "admin.whatsapp.qrAlt": ["name"],
};

/** Extrai os nomes de placeholder ICU (`{nome}` ou `{nome, ...}`) de uma string. */
function icuPlaceholders(message: string): string[] {
  const names = new Set<string>();
  for (const m of message.matchAll(/\{([a-zA-Z0-9_]+)(?:,[^}]*)?\}/g)) {
    names.add(m[1]);
  }
  return [...names].sort();
}

/** Percorre o catálogo inteiro coletando `caminho.pontuado -> placeholders`. */
function collectPlaceholders(
  node: unknown,
  path: string[],
  out: Map<string, string[]>,
) {
  if (typeof node === "string") {
    const names = icuPlaceholders(node);
    if (names.length > 0) out.set(path.join("."), names);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      collectPlaceholders(value, [...path, key], out);
    }
  }
}

describe("placeholders ICU do catálogo (src/messages/pt.json)", () => {
  it("toda mensagem com {placeholder} está na lista auditada — nenhuma nova, nenhuma sumiu", () => {
    const catalog = JSON.parse(
      readFileSync(join(process.cwd(), "src/messages/pt.json"), "utf8"),
    ) as Record<string, unknown>;

    const found = new Map<string, string[]>();
    collectPlaceholders(catalog, [], found);

    expect([...found.keys()].sort()).toEqual(Object.keys(ALLOWED).sort());
    for (const [key, names] of found) {
      expect(names, key).toEqual(ALLOWED[key]);
    }
  });
});
