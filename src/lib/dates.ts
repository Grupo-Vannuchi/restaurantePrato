import { siteConfig } from "@/config/site";

/**
 * Formatação de data e hora no fuso do restaurante.
 *
 * ⚠️ **Nunca instancie `Intl.DateTimeFormat` direto para mostrar data a uma
 * pessoa.** Sem a opção `timeZone`, o Intl formata no fuso do *processo* — que
 * em desenvolvimento é o da máquina de quem programa (São Paulo, onde o
 * resultado sai certo por coincidência) e na Vercel é UTC, onde sai errado.
 *
 * Santos é UTC−3, então das 21h à meia-noite os dois fusos discordam sobre o
 * dia: um lead recebido às 22h de terça aparecia no painel como quarta-feira,
 * enquanto a notificação por WhatsApp — a única superfície que já fixava o fuso
 * — dizia terça. As duas telas contavam histórias diferentes sobre o mesmo
 * lead, e nada no build, no typecheck ou no ambiente local acusava.
 *
 * `test/fuso-do-restaurante.test.ts` é a guarda: além de cobrar o dia certo,
 * ela varre `src/` e falha se qualquer outro arquivo instanciar o formatador
 * por conta própria.
 */
export function restaurantDateFormat(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  // `timeZone` vem DEPOIS do spread de propósito: o chamador não consegue
  // sobrescrevê-lo nem por engano. Este é o único lugar que decide o fuso.
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: siteConfig.timeZone,
  });
}

/**
 * O dia da semana de hoje NO FUSO DO RESTAURANTE, de 1 (segunda) a 7 (domingo).
 *
 * ⚠️ `new Date().getDay()` devolve o dia no fuso de quem executa: na Vercel,
 * UTC. Santos é UTC−3, então das 21h à meia-noite o servidor já virou o dia e o
 * restaurante não — e o cardápio abriria na aba de amanhã para quem entrasse às
 * 21h30 de uma terça.
 *
 * A conta passa por aqui porque este é o único lugar do projeto que decide
 * fuso, e `test/fuso-do-restaurante.test.ts` falha se outro arquivo formatar
 * data por conta própria.
 */
export function weekdayNoRestaurante(agora: Date = new Date()): number {
  // `en-CA` porque ele formata como AAAA-MM-DD, que é o formato que o
  // construtor de Date lê sem ambiguidade. O idioma aqui não é copy — é só o
  // formato mais previsível para reconstruir a data.
  const [ano, mes, dia] = restaurantDateFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(agora)
    .split("-")
    .map(Number);

  // Reconstruída em UTC: só a DATA importa daqui para a frente, e o fuso já foi
  // aplicado acima. `getUTCDay()` devolve 0 para domingo; a semana ISO começa
  // na segunda, que é como os dias do cardápio são numerados.
  const utc = new Date(Date.UTC(ano!, mes! - 1, dia!));
  return utc.getUTCDay() === 0 ? 7 : utc.getUTCDay();
}
