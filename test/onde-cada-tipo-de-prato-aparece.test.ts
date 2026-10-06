import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import mensagens from "@/messages/pt.json";
import { pratosDoDia } from "@/lib/cardapio";

/**
 * O painel promete onde o prato vai aparecer. Ele precisa estar dizendo a
 * verdade.
 *
 * O campo "Onde este prato aparece" tem três opções, e a dica já errou duas
 * vezes — a segunda delas descoberta em 06/10/2026, porque **esta guarda
 * passou a medir a coisa errada e ficou verde por cima do defeito que ela
 * nasceu para pegar**.
 *
 * A primeira versão da dica dizia que a vitrine "é a seleção com foto que
 * aparece na página inicial", dando a entender que marcar vitrine era o que
 * punha o prato na home. Não era: a home mostrava uma seleção de TODOS os
 * pratos. A dica foi corrigida e este arquivo fixou a correção asseverando
 * `pratosDaVitrine`, a função pura que fazia aquela seleção.
 *
 * ⚠️ **Depois disso a vitrine da home foi reconstruída e deixou de ler o
 * banco.** Hoje ela é `components/sections/menu-preview.tsx`, com quatro fotos
 * fixas no código, escolhidas pelo dono. A função `pratosDaVitrine` ficou órfã
 * — nenhuma página a chamava — e este teste continuou verde exercitando-a,
 * enquanto a frase que ele guardava voltou a ser falsa pelo outro lado: a dica
 * prometia que a home mostrava os pratos do painel, e a home não mostra
 * nenhum.
 *
 * E a opção `SHOWCASE` ficou pior que imprecisa. A DAL tem exatamente duas
 * consultas públicas de cardápio — `getBuffetDishes` (`kind: "BUFFET"`) e
 * `getPastaDishes` (`kind: "PASTA"`) —, nenhuma de `SHOWCASE`, e a home não
 * consulta nada. Quem marcasse "só na página inicial" salvava um prato que
 * **não aparece em página nenhuma do site**, e o painel dizia o contrário.
 *
 * Então as asserções abaixo deixaram de medir a função e passaram a medir a
 * ORIGEM: que a DAL não tem consulta de vitrine e que a home não importa a
 * DAL. É isso que o defeito mudou da última vez, e é o que a guarda tem de
 * ver mudar na próxima — se alguém religar a vitrine ao banco, estes testes
 * reprovam e a dica do painel volta à mesa junto.
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

const fonte = (...partes: string[]) =>
  readFileSync(join(process.cwd(), ...partes), "utf8");

const DAL = fonte("src", "lib", "queries.ts");
const VITRINE = fonte("src", "components", "sections", "menu-preview.tsx");

describe("onde cada tipo de prato aparece", () => {
  it("o cardápio da semana mostra só o buffet", () => {
    const naAba = pratosDoDia(doTipo("BUFFET"), 1);
    expect(naAba.map((p) => p.id)).toEqual(["do-buffet"]);
  });

  it("a seção de massas mostra só a ilha", () => {
    expect(doTipo("PASTA").map((p) => p.id)).toEqual(["da-ilha"]);
  });

  it("o prato de vitrine não entra em nenhuma das duas seções do cardápio", () => {
    expect(doTipo("BUFFET").map((p) => p.id)).not.toContain("da-vitrine");
    expect(doTipo("PASTA").map((p) => p.id)).not.toContain("da-vitrine");
  });
});

describe("a vitrine da home não lê o banco — e é isso que torna SHOWCASE um beco", () => {
  it("a DAL só tem consulta de buffet e de massa, e nenhuma de vitrine", () => {
    // Sentinela dupla: as duas consultas que EXISTEM têm de aparecer, senão
    // esta guarda passaria a vazio se a DAL fosse reescrita ou movida.
    expect(DAL).toMatch(/kind:\s*"BUFFET"/);
    expect(DAL).toMatch(/kind:\s*"PASTA"/);
    expect(DAL).not.toMatch(/kind:\s*"SHOWCASE"/);
  });

  it("a home não importa a DAL: as fotos dela são fixas no código", () => {
    // O que mudou calado da última vez. Religar isto é legítimo — mas então a
    // dica do painel volta a estar errada, e é por isso que reprova aqui.
    expect(VITRINE).not.toMatch(/from "@\/lib\/queries"/);
    expect(VITRINE).toMatch(/const FOTOS = \[/);
  });
});

describe("o que o painel diz sobre isso", () => {
  const cardapio = (mensagens as { admin: { cardapio: Record<string, string> } })
    .admin.cardapio;

  it("a dica não promete que a escolha controla a página inicial", () => {
    // A frase de agosto: "a vitrine é a seleção com foto que aparece na página
    // inicial".
    expect(cardapio.itemKindHint).not.toMatch(/vitrine é a seleção/i);
  });

  it("a dica não promete que a home mostra os pratos do painel", () => {
    // A frase de setembro, falsa desde que a vitrine virou foto fixa: "A
    // vitrine da página inicial mostra uma seleção de todos os pratos".
    expect(cardapio.itemKindHint).not.toMatch(/sele[çc][ãa]o de todos os pratos/i);
  });

  it("a dica diz que o campo decide o lugar no CARDÁPIO", () => {
    expect(cardapio.itemKindHint).toMatch(/card[áa]pio/i);
  });

  it("a opção de vitrine diz que o prato fica fora do cardápio", () => {
    expect(cardapio.kindShowcase).toMatch(/fora do card[áa]pio|n[ãa]o entra/i);
  });

  it("e não promete uma página inicial que não vai mostrá-lo", () => {
    // O rótulo era "Fora do cardápio, só na página inicial". A segunda metade
    // era falsa: a home não lê o banco, então o prato não aparecia em lugar
    // nenhum. Guarda verde por cima de meia frase mentirosa.
    expect(cardapio.kindShowcase).not.toMatch(/s[óo] na p[áa]gina inicial/i);
  });
});
