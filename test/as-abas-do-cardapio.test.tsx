import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { DayTabs } from "@/components/cardapio/day-tabs";
import { renderWithIntl, screen, userEvent, within } from "./test-utils";

/**
 * As abas de dia do cardápio, com o padrão `tablist` implementado de verdade.
 *
 * ⚠️ Este projeto já teve um `role="tablist"` declarado e não implementado —
 * o de "regiões que atendemos", removido em 27/08. Ele apontava `aria-controls`
 * para painéis que não existiam, não tinha navegação por setas e mantinha as
 * cinco abas na ordem de tabulação. Declarar o padrão ARIA e não cumpri-lo é
 * pior que não declarar: o leitor de tela promete um comportamento à pessoa e a
 * página não entrega.
 *
 * O que o padrão exige, e o que este componente cumpre:
 *
 * - **Uma única parada de tabulação** para o grupo inteiro. Cinco abas na
 *   ordem de tabulação obrigam a apertar Tab cinco vezes para passar por um
 *   seletor que a seta resolve numa tecla.
 * - **Setas movem entre as abas**, e circulam nas pontas.
 * - **Todos os painéis existem no DOM**, escondidos com `hidden`. Renderizar só
 *   o ativo faz o `aria-controls` das outras apontar para o nada.
 */
const ROTULOS = { 1: "Segunda", 2: "Terça", 3: "Quarta", 4: "Quinta", 5: "Sexta" };

/**
 * O título de cada painel, só para leitor de tela.
 *
 * ⚠️ O texto aqui é DIFERENTE do rótulo da aba de propósito: se os dois fossem
 * "Segunda", uma asserção que procurasse "Segunda" não distinguiria a aba do
 * título do painel, e o teste passaria achando ter encontrado um quando
 * encontrou o outro.
 */
const TITULOS = {
  1: "Buffet de Segunda",
  2: "Buffet de Terça",
  3: "Buffet de Quarta",
  4: "Buffet de Quinta",
  5: "Buffet de Sexta",
};

/*
 * ⚠️ **O dia agora vem do RELÓGIO, não só da prop — e foi por isso que estes
 * testes quebraram em 02/10/2026.**
 *
 * `DayTabs` recalcula o dia no navegador depois de montar, porque
 * `/cardapio` é estática e o valor do servidor congela no build (a sexta que
 * o site passou inteira dizendo ser quinta). A prop virou o palpite inicial,
 * e quem manda é `Date` dentro do fuso do restaurante.
 *
 * Então um teste que quer fixar o dia precisa fixar o RELÓGIO. Fixar só a
 * prop passaria a medir um caminho que o visitante nunca percorre.
 *
 * As datas abaixo são meio-dia em São Paulo (15:00 UTC), longe das bordas:
 * meia-noite UTC cairia no dia anterior aqui e o teste mediria outro dia sem
 * ninguém notar.
 */
function fixarDia(diaUtil: 1 | 2 | 3 | 4 | 5 | 6 | 7) {
  // 05/10/2026 é uma segunda-feira; somar leva ao dia desejado.
  const data = new Date(Date.UTC(2026, 9, 4 + diaUtil, 15, 0, 0));
  vi.setSystemTime(data);
}

function montar(hoje: number | null = null) {
  // Sem dia pedido, o relógio vai para o sábado: nenhum dia útil ativo por
  // hoje, que é o estado em que a prop manda sozinha.
  fixarDia((hoje ?? 6) as 1 | 2 | 3 | 4 | 5 | 6 | 7);
  return renderWithIntl(
    <DayTabs
      labels={ROTULOS}
      panelHeadings={TITULOS}
      todayLabel="hoje"
      selectorLabel="Dia da semana"
      today={hoje}
    >
      {[1, 2, 3, 4, 5].map((d) => (
        <p key={d}>Cardápio do dia {d}</p>
      ))}
    </DayTabs>,
  );
}

beforeEach(() => {
  // `shouldAdvanceTime` para o `userEvent` não travar esperando o relógio.
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

const abas = () => screen.getAllByRole("tab");

describe("as abas de dia do cardápio", () => {
  it("são um grupo com nome, e todas as abas existem", () => {
    montar();
    expect(screen.getByRole("tablist", { name: "Dia da semana" })).toBeInTheDocument();
    expect(abas()).toHaveLength(5);
  });

  it("todo painel existe no DOM, e só o ativo aparece", () => {
    // Renderizar só o ativo faria `aria-controls` das outras apontar para o
    // nada — o defeito exato do tablist que saiu daqui em 27/08.
    montar();
    for (const dia of [1, 2, 3, 4, 5]) {
      const painel = document.getElementById(`painel-${dia}`);
      expect(painel, `painel do dia ${dia} não existe`).not.toBeNull();
    }
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  });

  it("cada aba aponta para um painel que existe de verdade", () => {
    montar();
    for (const aba of abas()) {
      const alvo = aba.getAttribute("aria-controls");
      expect(alvo).toBeTruthy();
      expect(document.getElementById(alvo!), `${alvo} não existe`).not.toBeNull();
    }
  });

  it("o grupo inteiro é uma parada de tabulação só", () => {
    montar();
    const focaveis = abas().filter((a) => a.getAttribute("tabindex") !== "-1");
    expect(focaveis).toHaveLength(1);
    expect(focaveis[0]).toHaveAttribute("aria-selected", "true");
  });

  it("as setas movem entre as abas e circulam nas pontas", async () => {
    const user = userEvent.setup();
    montar(1);
    await user.tab();
    expect(abas()[0]).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(abas()[1]).toHaveFocus();
    expect(abas()[1]).toHaveAttribute("aria-selected", "true");

    // Da primeira para trás, vai para a última.
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(abas()[4]).toHaveFocus();
  });

  it("clicar numa aba troca o painel visível", async () => {
    const user = userEvent.setup();
    montar(1);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Cardápio do dia 1");
    await user.click(abas()[3]!);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Cardápio do dia 4");
  });

  it("abre no dia de hoje quando é dia útil", () => {
    montar(3);
    expect(abas()[2]).toHaveAttribute("aria-selected", "true");
    expect(within(abas()[2]!).getByText("hoje")).toBeInTheDocument();
  });

  it("abre na segunda quando hoje é fim de semana", () => {
    // `today` vem `null` no sábado e no domingo: a casa não abre, e não existe
    // aba para esses dias. Sem esta escolha o cardápio abriria em branco.
    montar(null);
    expect(abas()[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("hoje")).toBeNull();
  });

  /*
   * ⚠️ **A guarda do defeito de 02/10/2026: o dia do SERVIDOR estava velho e
   * nada acusava.**
   *
   * `/cardapio` é gerada estaticamente, então `weekdayNoRestaurante()` roda no
   * build. O último build tinha sido na quinta; o site passou a sexta inteira
   * abrindo na quinta, com a lista errada selecionada e o selo "Hoje" na aba
   * errada. Build verde, página 200, zero reprovas em tudo que se media.
   *
   * Este teste monta com a prop MENTINDO de propósito — o servidor diz quinta,
   * o relógio diz sexta — e exige que o navegador vença. É o caminho que o
   * visitante percorre todo dia depois da meia-noite.
   */
  it("corrige o dia quando o servidor ficou para trás", async () => {
    fixarDia(5);
    renderWithIntl(
      <DayTabs
        labels={ROTULOS}
        panelHeadings={TITULOS}
        todayLabel="hoje"
        selectorLabel="Dia da semana"
        today={4}
      >
        {[1, 2, 3, 4, 5].map((d) => (
          <p key={d}>Cardápio do dia {d}</p>
        ))}
      </DayTabs>,
    );
    const [, , , quinta, sexta] = screen.getAllByRole("tab");
    expect(sexta, "a sexta deveria estar selecionada").toHaveAttribute("aria-selected", "true");
    expect(quinta, "a quinta ficou selecionada com o dia do build").toHaveAttribute("aria-selected", "false");
    // E o selo "hoje" acompanha: ele é o que a pessoa lê, não o `aria-selected`.
    expect(within(sexta!).queryByText("hoje"), "o selo ficou na aba errada").not.toBeNull();
    expect(within(quinta!).queryByText("hoje")).toBeNull();
  });
});
