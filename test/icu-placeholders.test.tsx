import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createTranslator } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import messages from "@/messages/pt.json";
import { richTags } from "@/i18n/rich";
import { yearsInBusiness } from "@/config/site";

/**
 * Regressão do bug em `/experiencia`: a mensagem `experiencia.lead` tem o
 * placeholder ICU `{foundedYear}`, mas a página chamava `t.rich(…,
 * richTags)` — só os renderizadores de `<b>`/`<i>`, nunca um valor. Sem
 * `foundedYear`, o next-intl não lança exceção (que quebraria o build):
 * ele cai no `getMessageFallback` padrão, que devolve a própria chave
 * (`"experiencia.lead"`). É por isso que o bug só aparece olhando a página
 * renderizada, e não em `npm run typecheck` nem `npm run build` — os dois
 * passam mesmo com o placeholder faltando.
 *
 * ⚠️ **Mudou duas vezes em dois dias.** Em 28/09 a chave passou de `lead` a
 * `leadIntro`; em 29/09 o placeholder dela passou de `{foundedYear}` a
 * `{years}`, quando a copy do cliente substituiu "desde 1998" por "há tantos
 * anos". O bug guardado é o mesmo; mudaram o nome do alvo e o do valor.
 *
 * ⚠️ **Nenhuma das duas versões escreve o número à mão**, e é esse o ponto: a
 * copy do cliente dizia "25 anos", e a casa é de 1998. O placeholder faz a
 * página concordar com a home, que já publica o mesmo cálculo.
 *
 * (histórico) A chave nasceu como `lead`: A
 * abertura da página passou a ter três parágrafos, e só o primeiro carrega o
 * `{foundedYear}` — os outros dois vivem num array sem placeholder nenhum.
 * Endereçar um item de array por índice no `t.rich` é frágil, então o
 * parágrafo com placeholder ganhou chave própria. O bug que este arquivo
 * guarda é o mesmo; mudou o nome do alvo.
 *
 * O teste usa `createTranslator`, o mesmo motor de formatação por trás de
 * `useTranslations`/`getTranslations`, com o catálogo pt.json de verdade —
 * não um mock — para reproduzir exatamente a chamada de `page.tsx`. A página
 * em si é um Server Component assíncrono (usa `getTranslations`, que depende
 * de contexto de requisição do Next); renderizá-la neste setup Vitest/jsdom
 * não é prático, então o teste exercita a formatação real sem passar pelo
 * componente.
 */
describe("experiencia.leadIntro (t.rich com placeholder ICU)", () => {
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
    const callIndex = source.indexOf('t.rich("leadIntro"');
    expect(callIndex, 'chamada t.rich("leadIntro", ...) não encontrada em page.tsx').toBeGreaterThan(-1);
    const call = source.slice(callIndex, source.indexOf(")", callIndex) + 1);
    expect(call).toContain("years");
  });

  it("com years (a chamada correta), resolve o parágrafo de verdade", () => {
    const html = renderToStaticMarkup(
      <>{t.rich("leadIntro", { ...richTags, years: yearsInBusiness() })}</>,
    );
    /* ⚠️ Cobra o ANO, e não a frase em volta dele. A versão anterior exigia
       "desde 1998." com ponto final, e a reescrita da copy em 28/09 trocou o
       ponto por vírgula — a asserção quebrou sem que nada de errado tivesse
       acontecido. O que este teste prova é que o placeholder resolveu; a
       pontuação é da copy, e copy muda. */
    expect(html).toContain(String(yearsInBusiness()));
    expect(html).not.toContain("experiencia.leadIntro");
  });

  it("sem years (a chamada quebrada), cai no fallback — era exatamente o bug", () => {
    const html = renderToStaticMarkup(<>{t.rich("leadIntro", richTags)}</>);
    expect(html).toBe("experiencia.leadIntro");
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
  "metadata.ogTitle": ["brand"],
  "metadata.titleTemplate": ["brand"],
  "common.callUs": ["phone"],
  "home.hero.eyebrow": ["years"],
  "home.hero.goToSlide": ["n"],
  // A nota do depoimento, anunciada por extenso: "5/5" nao se le bem em voz alta.
  "home.testimonials.ratingLabel": ["rating"],
  // O link de rede social do rodape, que anunciava a chave crua do objeto.
  "footer.socialLink": ["brand", "network"],
  "experiencia.leadIntro": ["years"],
  // O primeiro marco da lista cita o tempo de casa; resolvido por `fillYears`.
  "experiencia.tradicao.items.0": ["years"],
  "novidades.imageCaption": ["title"],
  "cardapio.dayPanelHeading": ["day"],
  "cardapio.dishImageAlt": ["name"],
  "cardapio.pastaPortionNote": ["portion"],
  "cardapio.pastaIngredientsNote": ["n"],
  "cardapio.pastaGoToPhoto": ["n"],
  // Mesmo molde do carrossel da ilha: o marcador e montado no cliente, que
  // nao tem o catalogo, entao a pagina passa `n: "{n}"` e ele troca depois.
  "reservas.goToPhoto": ["n"],
  "footer.registration": ["value"],
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
