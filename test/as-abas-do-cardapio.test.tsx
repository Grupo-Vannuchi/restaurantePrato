import { describe, expect, it } from "vitest";

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

function montar(hoje: number | null = null) {
  return renderWithIntl(
    <DayTabs
      labels={ROTULOS}
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
});
