import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Ninguém monta o horário à mão — só `openingHoursLabel()` formata.
 *
 * A regra está escrita em maiúsculas no `AGENTS.md` e no próprio
 * `config/site.ts`, e nasceu de um defeito real: dois consumidores montavam a
 * frase a partir de `opens`/`closes` e publicavam "Aberto das 11h às 15h" — que
 * diz ao leitor que a casa abre no sábado. O helper SEMPRE inclui a faixa de
 * dias, e é essa a diferença.
 *
 * ⚠️ **Até hoje a regra não tinha teste.** `test/site-config.test.ts` cobre o
 * helper com dez casos, incluindo "nunca publica horário sem dizer em que dias".
 * O que faltava era garantir que os CONSUMIDORES o usem: um componente novo que
 * interpole `opens` e `closes` passa por typecheck, lint e build, e publica a
 * frase incompleta sem que nada acuse. A guarda apareceu quando o horário entrou
 * no rodapé e na página de contato em 11/09, e eu fui procurar o que impedia a
 * próxima pessoa de fazer isso à mão.
 *
 * ⚠️ **`json-ld.tsx` é a exceção, e não é conveniência.** O structured data pede
 * `opens: "11:00"` e `closes: "15:00"` crus, em `openingHoursSpecification` —
 * esse é o formato que faz o Google mostrar "Aberto · fecha às 15h" ao lado da
 * ficha. Ali o valor não é frase para humano, é campo de dado. Passá-lo pelo
 * helper quebraria o schema.
 */

/** Onde `opens`/`closes` podem ser lidos crus, e por quê. */
const EXCECOES = new Map([
  [
    "src/components/json-ld.tsx",
    "structured data: `openingHoursSpecification` exige os horários crus",
  ],
  ["src/config/site.ts", "é a origem do dado e a casa do próprio helper"],
]);

function tsx(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
    .map((f) => `${dir}/${f}`.replace(/\\/g, "/"));
}

describe("só o helper formata o horário", () => {
  const arquivos = tsx("src");

  it("nenhum consumidor lê opens/closes por fora", () => {
    // Sentinela: varredura vazia passaria sem examinar uma linha.
    expect(arquivos.length, "nenhum arquivo encontrado em src/").toBeGreaterThan(30);

    const infratores = arquivos.filter((caminho) => {
      if (EXCECOES.has(caminho)) return false;
      const texto = readFileSync(caminho, "utf8")
        // Comentário explica o defeito; código é que o comete. Esta guarda já
        // teria falhado contra a própria explicação no rodapé e no contato.
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      return /openingHours[\s\S]{0,40}?\.(opens|closes)|\.(opens|closes)\b/.test(texto);
    });

    expect(
      infratores,
      `Estes arquivos leem opens/closes direto: ${infratores.join(", ")}. ` +
        `Use openingHoursLabel(), que inclui a faixa de DIAS — formatar só as ` +
        `horas publica "das 11h às 15h" sem dizer que a casa fecha no fim de ` +
        `semana, e manda alguém até a porta fechada num sábado. Se o seu caso é ` +
        `campo de dado e não frase, acrescente-o às exceções deste teste com o ` +
        `motivo escrito.`,
    ).toEqual([]);
  });

  it("as exceções continuam existindo e continuam sendo exceções", () => {
    /*
     * Sem isto, o dia em que `json-ld.tsx` parar de emitir os horários crus
     * deixa uma exceção órfã na lista — e uma lista de exceções que ninguém
     * confere é por onde a regra volta a ser furada.
     */
    for (const [caminho, motivo] of EXCECOES) {
      const texto = readFileSync(caminho, "utf8");
      expect(
        /\.(opens|closes)\b/.test(texto),
        `${caminho} está na lista de exceções (${motivo}) mas não lê mais ` +
          `opens/closes: tire-o da lista.`,
      ).toBe(true);
    }
  });

  it("o rodapé e a página de contato publicam o horário pelo helper", () => {
    /*
     * O outro lado da regra: além de não montar à mão, os dois lugares onde o
     * horário é procurado primeiro precisam publicá-lo. O pixel é conferido por
     * `e2e/o-horario-aparece-onde-se-procura.spec.ts`; aqui fica a exigência de
     * que venha do helper, que é o que o e2e não consegue distinguir.
     */
    for (const caminho of [
      "src/components/layout/footer.tsx",
      "src/app/[locale]/(marketing)/contato/page.tsx",
    ]) {
      const texto = readFileSync(caminho, "utf8");
      expect(
        texto.includes("openingHoursLabel()"),
        `${caminho} deixou de publicar o horário pelo helper`,
      ).toBe(true);
    }
  });
});
