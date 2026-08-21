import { describe, expect, it } from "vitest";

import {
  InformationGallery,
  useInformationGallery,
} from "@/components/information-gallery";
import type { InformationView } from "@/lib/queries";
import { renderWithIntl, screen, userEvent, waitFor } from "./test-utils";

/**
 * Quem abre o lightbox pelo teclado precisa ir junto com o foco.
 *
 * O modal já declara `role="dialog"` e `aria-modal="true"` — ou seja, promete à
 * tecnologia assistiva que o resto da página está inerte enquanto ele estiver
 * aberto. Só que o foco continuava no botão que o abriu, **atrás** do overlay:
 * a promessa e o comportamento diziam coisas opostas. Na prática, quem navega
 * por teclado abria a foto e seguia tabulando pela página escondida por trás,
 * sem enxergar onde estava, sem alcançar o botão de fechar e sem as setas de
 * navegação — que existem e têm `aria-label`, mas eram inalcançáveis.
 *
 * E ao fechar com Esc o foco não voltava para lugar nenhum: caía no `<body>`, o
 * que joga a pessoa de volta ao topo do documento. Numa lista de novidades, é
 * perder o lugar na página inteira para ter olhado uma foto.
 *
 * Este é um teste de DOM, não de código-fonte: o defeito é de comportamento do
 * foco, e só aparece quando alguém de fato abre e fecha o modal.
 */
const ITENS: InformationView[] = [
  {
    id: "1",
    slug: "primeira",
    icon: "utensils",
    image: "/uma.webp",
    title: "Primeira novidade",
    description: "Descrição da primeira.",
    featured: false,
  },
  {
    id: "2",
    slug: "segunda",
    icon: "utensils",
    image: "/duas.webp",
    title: "Segunda novidade",
    description: "Descrição da segunda.",
    featured: false,
  },
];

/** Gatilho mínimo, no lugar do card real: só precisa abrir o carrossel. */
function Gatilho({ slug }: { slug: string }) {
  const galeria = useInformationGallery();
  return (
    <button type="button" onClick={() => galeria?.openAt(slug)}>
      abrir {slug}
    </button>
  );
}

function montar() {
  return renderWithIntl(
    <InformationGallery items={ITENS}>
      <Gatilho slug="primeira" />
      <Gatilho slug="segunda" />
    </InformationGallery>,
  );
}

describe("o foco no lightbox da galeria", () => {
  it("entra no modal quando ele abre", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByRole("button", { name: "abrir primeira" }));

    const modal = await screen.findByRole("dialog");
    await waitFor(() => {
      expect(modal.contains(document.activeElement)).toBe(true);
    });
  });

  it("volta para o gatilho quando o modal fecha com Esc", async () => {
    const user = userEvent.setup();
    montar();

    const gatilho = screen.getByRole("button", { name: "abrir segunda" });
    await user.click(gatilho);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(document.activeElement).toBe(gatilho);
    });
  });

  it("não deixa a tabulação escapar para a página atrás", async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByRole("button", { name: "abrir primeira" }));
    const modal = await screen.findByRole("dialog");

    // Uma volta inteira e mais um passo: se houver fuga, em algum momento o
    // foco cai num dos gatilhos, que estão fora do modal.
    for (let i = 0; i < 8; i++) {
      await user.tab();
      expect(modal.contains(document.activeElement)).toBe(true);
    }
  });
});
