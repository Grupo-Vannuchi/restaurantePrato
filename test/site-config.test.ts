import { describe, expect, it } from "vitest";
import {
  openingHoursLabel,
  phoneLink,
  siteConfig,
  type OpeningHours,
  type SiteConfig,
} from "@/config/site";
import messages from "@/messages/pt.json";

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

describe("horário de funcionamento", () => {
  it("o tipo aceita um restaurante sem horário conhecido", () => {
    // Enquanto o horário do Prato não chega, a config precisa poder omiti-lo —
    // exibir o horário herdado mandaria o visitante para a porta fechada.
    const semHorario: SiteConfig = { ...siteConfig, openingHours: undefined };
    expect(semHorario.openingHours).toBeUndefined();
  });
});

describe("openingHoursLabel", () => {
  it("devolve null quando não há horário nenhum (fork novo, campo omitido)", () => {
    // Diferente do teste acima (que testa `ordered.length === 0`), este mira o
    // guard `if (!hours) return null`. Como o parâmetro tem default
    // `= siteConfig.openingHours`, um `undefined` explícito cai no mesmo
    // horário real do Prato — não existe forma de alcançar esse branch pela
    // API normal. O cast abaixo é de propósito, só para simular em teste o
    // estado inicial de um fork novo (`openingHours` omitido da config, como
    // o AGENTS.md descreve). Não remover o cast "para limpar": sem ele este
    // guard fica sem nenhuma cobertura de teste.
    expect(openingHoursLabel(null as unknown as OpeningHours)).toBeNull();
  });

  it("devolve null quando não há dias configurados", () => {
    // Não dá para testar isto com `openingHoursLabel(undefined)`: em JS, um
    // argumento explicitamente `undefined` cai no mesmo valor default que a
    // chamada sem argumento — ou seja, no horário real do `siteConfig`, que
    // esta mesma task acabou de publicar. Para exercitar o branch "sem
    // horário" é preciso um `OpeningHours` explícito sem dias.
    expect(
      openingHoursLabel({ days: [], opens: "11:00", closes: "15:00" }),
    ).toBeNull();
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

describe("horário reescrito como prosa em pt.json (reservas)", () => {
  // `reservas.subtitle` e `reservas.metaDescription` (src/messages/pt.json)
  // repetem o horário como frase fixa — "De segunda a sexta, das 11h às
  // 15h." — em vez de chamar `openingHoursLabel()` como o `Fact` da página
  // faz. É proposital: fica melhor como prosa aprovada pelo cliente do que
  // como template. Mas isso cria uma segunda fonte da verdade: o card de
  // horário em /reservas acompanha `siteConfig.openingHours` sozinho; esta
  // prosa, não — se o horário mudar, alguém precisa lembrar de reescrever
  // as duas strings à mão.
  //
  // Por isso o teste abaixo prende `siteConfig.openingHours` ao par exato
  // que a prosa assume (Seg-Sex, 11h-15h). Qualquer mudança de dias ou de
  // um dos dois horários quebra este teste — de propósito, para forçar quem
  // mudou `openingHours` a também atualizar `reservas.subtitle` e
  // `reservas.metaDescription` em pt.json antes de dar a task por concluída.
  it("siteConfig.openingHours continua Seg-Sex, 11h–15h — o par que a prosa assume", () => {
    expect(
      siteConfig.openingHours,
      "openingHours mudou (dias e/ou horário). Atualize também " +
        "reservas.subtitle e reservas.metaDescription em " +
        "src/messages/pt.json — eles repetem o horário como prosa fixa e " +
        "não são gerados por openingHoursLabel().",
    ).toEqual({
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "11:00",
      closes: "15:00",
    } satisfies OpeningHours);
  });

  it("reservas.subtitle e reservas.metaDescription ainda descrevem esse horário", () => {
    // Complementa o teste acima: se a prosa for editada (por qualquer
    // motivo) sem que `openingHours` tenha mudado, este teste avisa —
    // mantendo as duas strings visíveis num diff em vez de deixá-las
    // divergir em silêncio.
    expect(messages.reservas.subtitle).toBe("De segunda a sexta, das 11h às 15h.");
    expect(messages.reservas.metaDescription).toBe(
      "Restaurante Prato, no Centro de Santos: almoço de segunda a sexta, das 11h às 15h. " +
        "Reserve sua mesa pelo WhatsApp e garanta lugar no horário de pico.",
    );

    // As igualdades acima mantêm a edição visível num diff. Estas amarram a
    // prosa ao `siteConfig`: se o horário mudar lá, o número some daqui e o
    // teste aponta a frase exata que ficou mentindo — em vez de exigir que
    // alguém lembre de conferir.
    const hora = (h: string) => h.replace(":00", "h");
    for (const texto of [
      messages.reservas.subtitle,
      messages.reservas.metaDescription,
    ]) {
      expect(texto).toContain(hora(siteConfig.openingHours!.opens));
      expect(texto).toContain(hora(siteConfig.openingHours!.closes));
      expect(texto.toLowerCase()).toContain("segunda a sexta");
    }
  });
});
