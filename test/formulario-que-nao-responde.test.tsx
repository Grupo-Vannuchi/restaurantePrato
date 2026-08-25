import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  Link: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/app/actions/gallery", () => ({
  createGalleryPhoto: vi.fn(),
  updateGalleryPhoto: vi.fn(),
}));

import { createGalleryPhoto } from "@/app/actions/gallery";
import { GalleryPhotoForm } from "@/components/admin/gallery-photo-form";
import { emptyGalleryPhotoForm } from "@/lib/gallery-form";
import { renderWithIntl, screen, userEvent, waitFor } from "./test-utils";

/**
 * Salvar que não chega ao servidor tem que aparecer na tela.
 *
 * Os formulários do painel já mostram a mensagem certa quando a ação
 * **responde** que não deu — nome duplicado, slug em uso, sessão expirada. O
 * buraco era o caso em que a ação **não chega a responder**: rede caída,
 * servidor reiniciando, deploy no meio da requisição. Sem `try/catch`, a
 * promessa rejeita e `setServerError` nunca é escrito.
 *
 * O react-hook-form devolve `isSubmitting` a false no seu próprio `finally` e
 * **relança** o erro. Ou seja: o botão volta a funcionar e a tela não diz nada.
 * A pessoa clica em "Salvar", vê o botão destravar, e não tem como saber se
 * salvou. Ambiguidade é pior que erro — diante dela, o caminho natural é clicar
 * de novo e arriscar duplicar o registro.
 *
 * Como em `test/upload-que-falha.test.tsx` e `test/exclusao-que-falha.test.tsx`,
 * a falha de transporte é simulada com a ação devolvendo `undefined`: ler `.ok`
 * de `undefined` lança dentro do `try`, igual ao `await` de uma chamada
 * recusada, e sem deixar promessa rejeitada órfã em `mock.results`.
 */
const acao = vi.mocked(createGalleryPhoto);
const MENSAGEM = "Não foi possível salvar. Tente de novo.";

beforeEach(() => acao.mockReset());

async function salvar() {
  const user = userEvent.setup();
  renderWithIntl(
    <GalleryPhotoForm mode="create" defaultValues={emptyGalleryPhotoForm()} />,
  );
  await user.click(screen.getByRole("button", { name: /salvar/i }));
}

describe("quando o salvamento não chega ao servidor", () => {
  it("avisa em vez de deixar a pessoa no escuro", async () => {
    acao.mockResolvedValue(undefined as never);

    await salvar();

    await waitFor(() => {
      expect(screen.getByText(MENSAGEM)).toBeInTheDocument();
    });
  });

  it("continua nomeando o erro que a própria ação devolve", async () => {
    // Sentinela: o `catch` novo não pode engolir o caminho que já funcionava.
    acao.mockResolvedValue({ ok: false, error: "unauthorized" });

    await salvar();

    await waitFor(() => {
      expect(screen.getByText(MENSAGEM)).toBeInTheDocument();
    });
  });
});

describe("os formulários que enviam para o servidor", () => {
  // A guarda contra a divergência. Ela cobre `admin/` E `forms/` de propósito:
  // a varredura anterior olhava só o painel, e por isso não viu que o
  // formulário PÚBLICO de contato tinha o mesmo buraco — o mais caro dos seis,
  // porque do outro lado dele está um cliente escrevendo para o restaurante.
  const PASTAS = [
    join(process.cwd(), "src", "components", "admin"),
    join(process.cwd(), "src", "components", "forms"),
  ];

  const ARQUIVOS = PASTAS.flatMap((pasta) =>
    readdirSync(pasta)
      .filter((n) => n.endsWith("-form.tsx"))
      .map((n) => ({ nome: n, caminho: join(pasta, n) })),
  );

  // Normaliza a quebra de linha: os arquivos do repo usam a do Windows, e o
  // recorte do corpo abaixo procura pela do Unix. Sem normalizar, a varredura
  // nunca acha o fim do onSubmit e acusa todo mundo, inclusive quem está certo.
  const fonte = (caminho: string) =>
    readFileSync(caminho, "utf8").split("\r\n").join("\n");

  const ANCORA = "async function onSubmit";
  const FIM_DA_FUNCAO = "\n  }\n";

  /** Os que enviam por react-hook-form, com um `onSubmit` que chama a ação. */
  const COM_ONSUBMIT = ARQUIVOS.filter((a) => fonte(a.caminho).includes(ANCORA));

  it("são seis os que enviam por onSubmit — senão a guarda não guarda", () => {
    expect(COM_ONSUBMIT.map((a) => a.nome).sort()).toEqual([
      "contact-form.tsx",
      "gallery-photo-form.tsx",
      "information-form.tsx",
      "menu-category-form.tsx",
      "menu-item-form.tsx",
      "testimonial-form.tsx",
    ]);
  });

  it("todos protegem o envio contra a ação que não responde", () => {
    const desprotegidos = COM_ONSUBMIT.filter(({ caminho }) => {
      const texto = fonte(caminho);
      const daAncora = texto.slice(texto.indexOf(ANCORA));
      const corpo = daAncora.slice(0, daAncora.indexOf(FIM_DA_FUNCAO));
      return !corpo.includes("try {") || !corpo.includes("} catch");
    }).map((a) => a.nome);

    expect(desprotegidos).toEqual([]);
  });

  it("deixa o login de fora de propósito", () => {
    // `login-form.tsx` é o sétimo arquivo `-form.tsx` e NÃO entra na varredura
    // acima — por decisão, não por descuido. Ele envia por `useActionState`,
    // sem `onSubmit`, e a ação `login()` termina em `redirect()`, que funciona
    // LANÇANDO um erro especial que o Next precisa receber. Um `try/catch` ali
    // engoliria o redirecionamento, e o login pararia de sair da tela de login.
    const nomes = ARQUIVOS.map((a) => a.nome);
    const login = ARQUIVOS.find((a) => a.nome === "login-form.tsx")!;

    expect(nomes).toContain("login-form.tsx");
    expect(COM_ONSUBMIT.map((a) => a.nome)).not.toContain("login-form.tsx");
    expect(fonte(login.caminho)).toMatch(/useActionState/);
  });
});
