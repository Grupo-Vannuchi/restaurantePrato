import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A galeria mostra COMIDA, e o ambiente mudou de lugar — nos dois sentidos.
 *
 * Decisão de 10/09/2026, acompanhando o projeto irmão: galeria é para o que se
 * come. As três fotos de ambiente (fachada, salão, balcão com salão) não foram
 * descartadas — foram para o topo das páginas de Horários, Experiência e
 * Contato, onde uma foto de ambiente diz algo sobre estar lá em vez de disputar
 * espaço com o prato.
 *
 * ⚠️ **Esta guarda existe porque a decisão foi aplicada aos DADOS e esquecida na
 * COPY.** O script de importação passou a carregar só comida no mesmo dia, e a
 * página continuou prometendo "o ambiente e os pratos da casa" no subtítulo e
 * "fotos do salão" na descrição de metadados — que é o texto do resultado de
 * busca. Eu mesmo corrigi a descrição equivalente no `llms.txt` em 11/09 e
 * passei por cima do catálogo, que é onde a frase aparece para o visitante.
 *
 * Meia decisão aplicada é pior que decisão nenhuma: o visitante clica num
 * resultado que promete o salão e encontra vinte e duas fotos de bandeja.
 *
 * As quatro verificações fecham o cerco:
 *
 * 1. o script de importação não carrega foto de ambiente
 * 2. a copy da galeria não promete ambiente
 * 3. cada foto de ambiente continua sendo usada por alguma página
 * 4. sentinelas: existe lista para varrer e existe pasta de ambiente
 */

/** As palavras que descrevem o lugar, e não o que se come. */
const PALAVRAS_DE_AMBIENTE = ["salão", "salao", "ambiente", "fachada", "mesas"];

const importador = readFileSync("scripts/importa-galeria.mjs", "utf8");
const catalogo = JSON.parse(readFileSync("src/messages/pt.json", "utf8")) as {
  galeria: Record<string, string>;
};

describe("a galeria mostra comida", () => {
  it("o script de importação não carrega foto de ambiente", () => {
    /*
     * Só a LISTA, não o arquivo inteiro: o docblock do script conta a história
     * da mudança e cita "fachada, salão e balcão" ao explicar o que saiu. É a
     * armadilha que este projeto já pegou três vezes — a guarda casando com a
     * própria explicação em vez de com o código.
     */
    const lista = /const FOTOS = \[([\s\S]*?)\n\];/.exec(importador);
    expect(lista, "a lista FOTOS não foi encontrada no importador").not.toBeNull();

    const arquivos = [...lista![1]!.matchAll(/\["([^"]+)"/g)].map((m) => m[1]!);
    // Sentinela: lista vazia passaria todas as asserções abaixo sem examinar nada.
    expect(arquivos.length, "a lista de fotos está vazia").toBeGreaterThan(10);

    const doLugar = arquivos.filter((a) =>
      PALAVRAS_DE_AMBIENTE.some((p) => a.includes(p)),
    );
    expect(
      doLugar,
      `a galeria voltou a carregar foto de ambiente: ${doLugar.join(", ")}. ` +
        `Ambiente vai para o topo de uma página, por \`image\` no \`PageHeader\`.`,
    ).toEqual([]);
  });

  it("a copy da galeria não promete ambiente", () => {
    const textos = Object.entries(catalogo.galeria).filter(
      ([, v]) => typeof v === "string",
    );
    // Sentinela: namespace vazio ou renomeado passaria calado.
    expect(textos.length, "o namespace galeria do catálogo está vazio").toBeGreaterThan(3);

    const prometendo = textos.filter(([, valor]) =>
      PALAVRAS_DE_AMBIENTE.some((p) => valor.toLowerCase().includes(p)),
    );
    expect(
      prometendo.map(([k, v]) => `galeria.${k}: "${v}"`),
      `A copy da galeria promete o que ela não mostra mais desde 10/09. A ` +
        `descrição de metadados é o texto do resultado de busca: prometer o salão ` +
        `ali leva alguém a clicar esperando o lugar e encontrar bandeja.`,
    ).toEqual([]);
  });

  it("cada foto de ambiente continua sendo usada por uma página", () => {
    const doAmbiente = readdirSync("public/ambiente");
    // Sentinela: pasta vazia faria o laço abaixo não rodar nenhuma vez.
    expect(doAmbiente.length, "public/ambiente está vazia").toBeGreaterThan(0);

    /*
     * As fotos saíram da galeria mas não do site. Sem esta verificação, o outro
     * jeito de "cumprir" a decisão é apagar as três — e aí as páginas de
     * Horários, Experiência e Contato perdem o topo com foto, que foi a outra
     * metade da mudança.
     */
    const fontes = varre("src")
      .map((c) => readFileSync(c, "utf8"))
      .join("\n");

    const orfas = doAmbiente.filter((f) => !fontes.includes(`ambiente/${f}`));
    expect(
      orfas,
      `Foto de ambiente sem uso: ${orfas.join(", ")}. Ela saiu da galeria em ` +
        `10/09 para virar topo de página; se não é mais usada, ou a página perdeu ` +
        `a foto ou o arquivo ficou para trás.`,
    ).toEqual([]);
  });
});

/** Todos os `.tsx` de um diretório, recursivamente. */
function varre(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `${dir}/${f}`);
}
