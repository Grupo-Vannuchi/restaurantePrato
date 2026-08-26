import { describe, expect, it } from "vitest";

import { Input, Select, Textarea } from "@/components/ui/field";
import { StatusMessage } from "@/components/ui/status-message";
import { AdminNotice } from "@/components/admin/admin-notice";
import { renderWithIntl, screen, userEvent, waitFor } from "./test-utils";

/** A região sozinha, sem nada dentro. */
const AdminNoticeVazio = () => <AdminNotice>conteúdo</AdminNotice>;

/**
 * Três defeitos introduzidos pelos próprios commits de acessibilidade de hoje.
 *
 * Ficam num arquivo só, e com este comentário, porque a lição é sobre o modo de
 * errar: cada um passou por typecheck, lint, build e por testes que eu mesmo
 * escrevi para a funcionalidade que eles quebram. Nenhum apareceria sem uma
 * segunda leitura procurando especificamente por eles.
 */

describe("a região viva do StatusMessage", () => {
  /**
   * `admin-notice.tsx` documenta, com todas as letras: "a região fica no DOM
   * desde sempre, vazia — uma região viva só é anunciada de forma confiável se
   * já existir quando o texto muda; criá-la junto com a mensagem faz o leitor
   * de tela perder o anúncio."
   *
   * E o `StatusMessage`, escrito no mesmo dia, fazia o contrário: `if
   * (!children) return null`. O elemento nascia junto com a mensagem.
   *
   * Para `tone="error"` o estrago é pequeno — `role="alert"` é assertivo e a
   * maioria dos leitores anuncia na inserção. Para `success` e `warning`, que
   * são `role="status"`, é justamente o caso não confiável: a confirmação
   * "Configuração salva." era a mais provável de passar em silêncio.
   */
  it("existe no DOM antes de haver mensagem", () => {
    renderWithIntl(<StatusMessage tone="success">{null}</StatusMessage>);

    const regiao = screen.getByRole("status");
    expect(regiao).toBeInTheDocument();
    expect(regiao).toBeEmptyDOMElement();
  });

  it("mantém o papel certo para cada tom", () => {
    const { unmount } = renderWithIntl(
      <StatusMessage tone="warning">{null}</StatusMessage>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    unmount();

    renderWithIntl(<StatusMessage tone="error">{null}</StatusMessage>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("mostra a mensagem quando ela chega", () => {
    renderWithIntl(<StatusMessage tone="success">Configuração salva.</StatusMessage>);

    expect(screen.getByRole("status")).toHaveTextContent("Configuração salva.");
  });
});

describe("a ordem do foco no aviso do painel", () => {
  /**
   * `announce()` chamava `setMensagem()` e logo em seguida `focus()`. Em React,
   * a atualização de estado é agendada: o `focus()` roda ANTES de o DOM ter a
   * mensagem, então o elemento focado está literalmente vazio nesse instante.
   *
   * Funcionava por acidente — a atualização seguinte dispara o `aria-live`, e o
   * anúncio sai por esse caminho. Mas o movimento de foco em si levava a pessoa
   * para um elemento sem conteúdo, e o teste que eu tinha escrito não pegava
   * isso porque só verificava QUEM tem o foco, não o que havia lá dentro.
   *
   * A região também ganhou nome próprio: mover o foco de propósito e não dizer
   * para onde é meio caminho.
   *
   * ⚠️ LIMITE DESTE TESTE: ele mede o ESTADO FINAL, não o instante do foco.
   * `waitFor` reexecuta até a mensagem chegar, então ele passa com a ordem
   * errada também — e passou, quando escrito. A correção da ordem está aqui por
   * ser a implementação correta, não porque este teste a tenha pego. Pegá-la
   * exigiria interceptar a chamada de `focus` e inspecionar o DOM naquele
   * instante, o que custa mais complexidade do que o defeito merece.
   */
  it("o foco chega quando a mensagem já está lá", async () => {
    const { AdminNotice } = await import("@/components/admin/admin-notice");
    const { useAdminNotice } = await import("@/components/admin/admin-notice");

    function Gatilho() {
      const aviso = useAdminNotice();
      return (
        <button type="button" onClick={() => aviso?.announce("Foto excluída.")}>
          disparar
        </button>
      );
    }

    const user = userEvent.setup();
    renderWithIntl(
      <AdminNotice>
        <Gatilho />
      </AdminNotice>,
    );

    await user.click(screen.getByRole("button", { name: "disparar" }));

    await waitFor(() => {
      expect(document.activeElement).toHaveTextContent("Foto excluída.");
    });
  });

  it("a região se apresenta ao receber o foco", () => {
    renderWithIntl(<AdminNoticeVazio />);

    expect(screen.getByRole("status")).toHaveAccessibleName();
  });
});

describe("o aria-invalid das primitivas de campo", () => {
  /**
   * `{...props}` vinha DEPOIS do atributo calculado, e `aria-invalid` não era
   * desestruturado da assinatura — então o spread vencia o cálculo. Um campo
   * com erro na tela e `aria-invalid={false}` recebido de fora renderizava
   * `aria-invalid="false"`: a mensagem aparecia e o campo se declarava válido.
   *
   * `id` e `aria-describedby` estavam protegidos porque foram desestruturados;
   * este ficou de fora. Hoje nenhum chamador passa a prop — é defeito latente,
   * do tipo que só aparece quando alguém confia na primitiva.
   */
  it("o erro vence o aria-invalid que vier de fora", () => {
    renderWithIntl(
      <Input id="a" aria-label="Campo" aria-invalid={false} error="Obrigatório." />,
    );

    expect(screen.getByLabelText("Campo")).toHaveAttribute("aria-invalid", "true");
  });

  it("vale para área de texto e para seleção", () => {
    const { unmount } = renderWithIntl(
      <Textarea id="b" aria-label="Texto" aria-invalid={false} error="Obrigatório." />,
    );
    expect(screen.getByLabelText("Texto")).toHaveAttribute("aria-invalid", "true");
    unmount();

    renderWithIntl(
      <Select id="c" aria-label="Escolha" aria-invalid={false} error="Obrigatório.">
        <option value="">—</option>
      </Select>,
    );
    expect(screen.getByLabelText("Escolha")).toHaveAttribute("aria-invalid", "true");
  });

  it("sem erro, respeita o que o chamador pediu", () => {
    renderWithIntl(<Input id="d" aria-label="Campo" aria-invalid={true} />);

    expect(screen.getByLabelText("Campo")).toHaveAttribute("aria-invalid", "true");
  });
});
