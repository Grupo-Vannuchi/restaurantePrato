import { describe, expect, it } from "vitest";

import mensagens from "@/messages/pt.json";
import { pratosDaVitrine } from "@/lib/menu-showcase";
import { pratosDoDia } from "@/lib/cardapio";

/**
 * O painel promete onde o prato vai aparecer. Ele precisa estar dizendo a
 * verdade.
 *
 * O campo "Onde este prato aparece" tem três opções, e a dica dizia que a
 * vitrine "é a seleção com foto que aparece na página inicial". Isso dá a
 * entender que marcar vitrine é o que coloca o prato na home — e não é.
 *
 * O que de fato acontece hoje, e é este teste que fixa:
 *
 * - O tipo decide o que sai **no cardápio**: buffet vai para as abas de dia,
 *   massa vai para a seção de massas, e vitrine não entra em nenhuma das duas.
 * - A **vitrine da home mostra uma seleção de todos os pratos**, seja qual for
 *   o tipo. Nenhuma escolha no painel muda isso.
 *
 * O comportamento é defensável: deixa a casa ter um prato de assinatura que não
 * entra no rodízio da semana mas continua aparecendo na home. O que estava
 * errado era o texto, que prometia exclusividade.
 *
 * ⚠️ Uma dica de painel errada custa mais que um texto feio: quem cadastra é o
 * dono do restaurante, e ele vai marcar as opções acreditando no que leu. Se o
 * resultado não bater, ele conclui que o site está quebrado — e nada no build,
 * no typecheck ou em teste nenhum acusava isso.
 */
const prato = (id: string, kind: "BUFFET" | "PASTA" | "SHOWCASE") => ({
  id,
  kind,
  weekdays: [],
  category: { slug: "geral", name: "Geral" },
});

const TODOS = [
  prato("do-buffet", "BUFFET"),
  prato("da-ilha", "PASTA"),
  prato("da-vitrine", "SHOWCASE"),
];

/** Como as consultas separam: cada uma pede um tipo. */
const doTipo = (kind: string) => TODOS.filter((p) => p.kind === kind);

describe("onde cada tipo de prato aparece", () => {
  it("o cardápio da semana mostra só o buffet", () => {
    const naAba = pratosDoDia(doTipo("BUFFET"), 1);
    expect(naAba.map((p) => p.id)).toEqual(["do-buffet"]);
  });

  it("a seção de massas mostra só a ilha", () => {
    expect(doTipo("PASTA").map((p) => p.id)).toEqual(["da-ilha"]);
  });

  it("o prato de vitrine não entra em nenhuma das duas seções do cardápio", () => {
    // É a única coisa que marcar "vitrine" de fato faz.
    expect(doTipo("BUFFET").map((p) => p.id)).not.toContain("da-vitrine");
    expect(doTipo("PASTA").map((p) => p.id)).not.toContain("da-vitrine");
  });

  it("a vitrine da home mostra os três tipos, e não só o marcado como vitrine", () => {
    // Aqui está o que a dica do painel dava a entender errado.
    const naHome = pratosDaVitrine([{ items: TODOS }], 9);
    expect(naHome.map((p) => p.id)).toEqual(["do-buffet", "da-ilha", "da-vitrine"]);
  });
});

describe("o que o painel diz sobre isso", () => {
  const cardapio = (mensagens as { admin: { cardapio: Record<string, string> } })
    .admin.cardapio;

  it("a dica não promete que a escolha controla a página inicial", () => {
    // A frase antiga: "a vitrine é a seleção com foto que aparece na página
    // inicial". A home mostra todos os pratos, então marcar vitrine não é o
    // que coloca um prato lá.
    expect(cardapio.itemKindHint).not.toMatch(/vitrine é a seleção/i);
  });

  it("a dica diz que o campo decide o lugar no CARDÁPIO", () => {
    expect(cardapio.itemKindHint).toMatch(/card[áa]pio/i);
  });

  it("a opção de vitrine diz que o prato fica fora do cardápio", () => {
    // O rótulo "Vitrine da página inicial" descrevia um efeito que ele não tem
    // sozinho. O que ele garante é a AUSÊNCIA do cardápio.
    expect(cardapio.kindShowcase).toMatch(/fora do card[áa]pio|n[ãa]o entra/i);
  });
});
