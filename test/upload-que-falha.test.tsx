import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/app/actions/upload", () => ({ uploadImageAction: vi.fn() }));

import { uploadImageAction } from "@/app/actions/upload";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { renderWithIntl, screen, userEvent, waitFor } from "./test-utils";

/**
 * Envio de imagem que quebra não pode girar para sempre.
 *
 * `onFile` aguardava `uploadImageAction(fd)` sem tratar falha. A ação devolve
 * erro tipado quando ela mesma recusa o arquivo — grande demais, não é imagem,
 * bucket errado — e esses casos a tela já sabia nomear. O que faltava era a
 * chamada **não chegar a rodar**: acima do teto de corpo da requisição (16 MB)
 * o Next recusa antes da ação; uma queda de rede no meio do envio dá no mesmo.
 * Nos dois, a promessa rejeita.
 *
 * O estrago é maior do que "não aparece mensagem": `setUploading(false)` fica
 * para trás, então o botão continua desabilitado com "Enviando…" indefinidamente,
 * e a linha que limpa o `<input type="file">` também não roda — reescolher a
 * MESMA foto não dispara evento nenhum, porque o valor do campo não mudou. A
 * pessoa fica presa sem nem poder tentar de novo com o mesmo arquivo.
 *
 * Quem esbarra nisso é justamente quem vai usar o painel todo dia: foto de
 * celular passa de 16 MB com facilidade.
 */
const acao = vi.mocked(uploadImageAction);

function arquivo(): File {
  return new File(["conteudo-de-imagem"], "foto.jpg", { type: "image/jpeg" });
}

/**
 * A falha é simulada pela ação devolvendo algo inutilizável, e não por uma
 * promessa rejeitada.
 *
 * Do ponto de vista do componente é o mesmo caminho: ler `res.ok` de `undefined`
 * lança dentro do `try`, exatamente como lançaria o `await` de uma chamada que
 * o Next recusou antes de executar. E é um cenário real por si só — uma ação
 * que não responde nada devolve `undefined` aqui.
 *
 * O motivo de não usar `mockRejectedValue`: o Vitest guarda o valor devolvido
 * por cada chamada em `mock.results`, e uma promessa rejeitada guardada ali
 * nunca é consumida — o teste fica vermelho por rejeição não tratada mesmo com
 * todas as asserções passando. Verificado com uma sonda: `try/catch` num
 * manipulador assíncrono segura a exceção normalmente neste arnês.
 */
function semResposta(): undefined {
  return undefined;
}

beforeEach(() => acao.mockReset());

describe("quando o envio da imagem quebra", () => {
  it("para de girar e explica que falhou", async () => {
    acao.mockImplementation(semResposta as never);
    const user = userEvent.setup();

    const { container } = renderWithIntl(
      <ImageUploadField preset="gallery" value="" onChange={() => {}} />,
    );

    const campo = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(campo, arquivo());

    await waitFor(() => {
      expect(screen.getByText("Falha no upload. Tente de novo.")).toBeInTheDocument();
    });

    // O botão volta a aceitar uma nova tentativa.
    const botao = screen.getByRole("button", { name: /Enviar imagem/i });
    expect(botao).not.toBeDisabled();
  });

  it("libera o campo para reescolher o mesmo arquivo", async () => {
    acao.mockImplementation(semResposta as never);
    const user = userEvent.setup();

    const { container } = renderWithIntl(
      <ImageUploadField preset="gallery" value="" onChange={() => {}} />,
    );

    const campo = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(campo, arquivo());

    // Sem a limpeza, o valor continua apontando para o arquivo escolhido e
    // selecioná-lo de novo não dispara `change`.
    await waitFor(() => expect(campo.value).toBe(""));
  });

  it("continua nomeando os erros que a própria ação devolve", async () => {
    // Sentinela: o `catch` novo não pode engolir o caminho que já funcionava.
    acao.mockResolvedValue({ ok: false, error: "bucket_not_found" });
    const user = userEvent.setup();

    const { container } = renderWithIntl(
      <ImageUploadField preset="gallery" value="" onChange={() => {}} />,
    );

    const campo = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(campo, arquivo());

    await waitFor(() => {
      expect(screen.getByText(/Bucket n.o encontrado no storage/)).toBeInTheDocument();
    });
  });
});
