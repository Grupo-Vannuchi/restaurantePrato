import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/leads", () => ({ submitContactLead: vi.fn() }));

import { ContactForm } from "@/components/forms/contact-form";
import { renderWithIntl, screen } from "./test-utils";

/**
 * A pessoa só descobria o que era obrigatório depois de errar.
 *
 * O formulário público não tinha `required`, `aria-required` nem marca visual
 * em campo nenhum — mas a validação do servidor exige nome, e-mail e mensagem.
 * Quem preenche só a mensagem aperta enviar, o formulário recusa, e aí sim
 * aponta. Para quem usa leitor de tela é pior: a informação de que o campo é
 * obrigatório é anunciada JUNTO com o rótulo, no momento em que o foco chega
 * — quando ela não existe, não há como saber antes.
 *
 * A correção depois de errar já funcionava (`test/campo-com-erro-anunciado`);
 * o que faltava era antes.
 *
 * Telefone e empresa continuam opcionais, e continuam sem marca: marcar tudo
 * não informa nada.
 */
const OBRIGATORIOS = ["name", "email", "message"];
const OPCIONAIS = ["phone", "company"];

describe("o formulário de contato diz o que é obrigatório antes do envio", () => {
  it("marca nome, e-mail e mensagem como obrigatórios", () => {
    renderWithIntl(<ContactForm />);
    for (const id of OBRIGATORIOS) {
      const campo = document.getElementById(id);
      expect(campo, `campo ${id} não encontrado`).not.toBeNull();
      expect(campo, `${id} deveria ser obrigatório`).toBeRequired();
    }
  });

  it("não marca os campos que são de fato opcionais", () => {
    // Sentinela: marcar tudo de obrigatório passaria no teste acima e não
    // informaria nada a ninguém.
    renderWithIntl(<ContactForm />);
    for (const id of OPCIONAIS) {
      expect(document.getElementById(id), `${id} não deveria ser obrigatório`).not
        .toBeRequired();
    }
  });

  it("mostra a marca visual só nos obrigatórios, e explica o que ela quer dizer", () => {
    renderWithIntl(<ContactForm />);

    // A legenda existe porque um asterisco sozinho não se explica.
    expect(screen.getByText(/obrigat/i)).toBeInTheDocument();

    for (const id of OBRIGATORIOS) {
      const rotulo = document.querySelector(`label[for="${id}"]`);
      expect(rotulo?.textContent, `o rótulo de ${id} não traz a marca`).toContain("*");
    }
    for (const id of OPCIONAIS) {
      const rotulo = document.querySelector(`label[for="${id}"]`);
      expect(rotulo?.textContent, `o rótulo de ${id} não devia ter marca`).not.toContain(
        "*",
      );
    }
  });

  it("não deixa o leitor de tela anunciar a estrelinha", () => {
    // O `required` do campo já é anunciado pelo leitor. A estrela é o mesmo
    // recado, para quem enxerga — lida em voz alta viraria "asterisco".
    renderWithIntl(<ContactForm />);
    const marca = document.querySelector('label[for="name"] [aria-hidden="true"]');
    expect(marca, "a marca visual precisa ficar fora da árvore de acessibilidade")
      .not.toBeNull();
    expect(marca).toHaveTextContent("*");
  });
});
