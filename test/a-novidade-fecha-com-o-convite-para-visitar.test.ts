import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import mensagens from "@/messages/pt.json";
import { openingHoursLabel } from "@/config/site";

/**
 * O fim de cada novidade estava vazio, e o vazio foi aberto por nós.
 *
 * Em 27/08 saiu dali a tabela que afirmava atender 171 bairros e cidades de São
 * Paulo — herança da agência, e um fato que ninguém confirmou. A remoção estava
 * certa; o que ficou foi um artigo terminando em nada, logo abaixo do texto que
 * a pessoa acabou de ler.
 *
 * Entra no lugar o bloco de visita: onde fica, que horas abre, e o convite para
 * reservar. Não é para informar pela primeira vez — o rodapé diz o mesmo poucas
 * centenas de pixels abaixo, com o mapa. É para pegar quem terminou de ler e
 * está decidindo se vem.
 *
 * ⚠️ **Uma divergência deliberada em relação ao projeto irmão.** Lá o horário
 * sai de uma string do catálogo (`footer.hours`). Aqui isso é proibido: o
 * `AGENTS.md` registra que dois consumidores montaram a linha só com
 * `opens`/`closes` e renderizaram "Aberto das 11h às 15h" — que afirma, para
 * quem lê, que a casa abre todo dia. O Prato fecha no fim de semana, e a frase
 * sem os dias manda o visitante para a porta fechada no sábado. A estrutura é a
 * mesma; a fonte do horário não pode ser.
 */
const FONTE = readFileSync(
  join(process.cwd(), "src/components/visit-block.tsx"),
  "utf8",
);

const PAGINA = readFileSync(
  join(process.cwd(), "src/app/[locale]/(marketing)/novidades/[slug]/page.tsx"),
  "utf8",
);

/** Sem comentários: a explicação acima cita a chave proibida pelo nome. */
const semComentarios = (texto: string) =>
  texto
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\/.*$/gm, "");

describe("o bloco de visita no fim da novidade", () => {
  it("é renderizado pela página do artigo", () => {
    expect(semComentarios(PAGINA)).toMatch(/<VisitBlock\s*\/>/);
  });

  it("lê o horário pelo ajudante, e nunca de uma string do catálogo", () => {
    const codigo = semComentarios(FONTE);
    expect(codigo, "precisa chamar openingHoursLabel()").toMatch(
      /openingHoursLabel\(\)/,
    );
    // A chave que o projeto irmão usa. Aqui ela nem existe, e não deve passar a
    // existir: uma linha de horário sem os dias é pior que nenhuma.
    expect(codigo).not.toMatch(/footer\.hours|t\("hours"\)/);
  });

  it("some com a linha de horário quando não há horário", () => {
    // `openingHoursLabel` devolve `null` quando `openingHours` não está
    // configurado — e ele é opcional no tipo de propósito. Sem esta guarda o
    // bloco renderizaria um rótulo "Horário" seguido de nada.
    expect(semComentarios(FONTE)).toMatch(/horario\s*\?|hours\s*\?|horas\s*\?/);
  });

  it("lê o endereço da configuração, não copiado à mão", () => {
    // Uma cópia no rodapé de todo artigo sobreviveria a uma mudança de endereço.
    expect(semComentarios(FONTE)).toMatch(/fullAddress\(\)/);
  });

  it("convida para reservar", () => {
    expect(semComentarios(FONTE)).toMatch(/<ReserveButton/);
  });

  it("tem título próprio no catálogo", () => {
    const titulo = (mensagens as { novidades: Record<string, string> }).novidades
      .visitTitle;
    expect(titulo, "chave novidades.visitTitle ausente").toBeTruthy();
  });

  it("o ajudante de horário devolve os dias, e não só as horas", () => {
    // Sentinela do PORQUÊ desta divergência: se um dia o ajudante passar a
    // devolver "das 11h às 15h" sem os dias, este teste falha e alguém revisa
    // a decisão em vez de descobrir pelo cliente que apareceu no sábado.
    const rotulo = openingHoursLabel();
    if (rotulo === null) return; // sem horário configurado, nada a cobrar
    // Os dias saem abreviados ("Seg a sex, das 11h às 15h"). O que a sentinela
    // cobra é que EXISTAM, não a forma: uma linha só de horas é a que manda o
    // visitante para a porta fechada no sábado.
    expect(rotulo).toMatch(/^(seg|ter|qua|qui|sex|s[áa]b|dom)/i);
  });
});
