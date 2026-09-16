import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A suíte de ponta a ponta não pode medir o site de outro cliente.
 *
 * ⚠️ **Este repositório é fork do site pronto de outro restaurante, e o fork
 * ainda roda nesta máquina.** Rotas, componentes, cabeçalho, rodapé, cardápio,
 * galeria e reservas são os MESMOS — foi exatamente isso que se quis
 * reaproveitar. O que difere é dado de cliente.
 *
 * Consequência: um servidor do projeto irmão responde a toda rota que esta
 * suíte visita, com a mesma estrutura de DOM. Boa parte das 235 asserções
 * passaria. Não é um erro que se vê no relatório — é 235 verdes medidos no site
 * de outra empresa.
 *
 * E o caminho para isso estava aberto até 16/09: `playwright.config.ts` subia o
 * servidor local em **3000** com `reuseExistingServer`, e 3000 é, nesta
 * máquina, onde o projeto irmão costuma estar. `npm run test:e2e` sem
 * `E2E_BASE_URL` reusava o servidor do vizinho e media o site dele.
 *
 * Duas defesas, e a segunda é a que importa:
 *
 * 1. a porta local sai do 3000 — resolve o caso do vizinho;
 * 2. a suíte CONFIRMA a identidade do servidor antes de asseverar qualquer
 *    coisa — resolve também o `E2E_BASE_URL` apontado para o lugar errado, que
 *    nenhuma troca de porta alcança.
 *
 * ⚠️ A confirmação é POSITIVA: ela exige as marcas deste cliente, e nunca
 * procura as do anterior. Reconhecer o vizinho exigiria escrever o nome dele
 * aqui, que é o que `test/brand-hygiene.test.ts` varre e proíbe.
 */
const CONFIG = readFileSync(join(process.cwd(), "playwright.config.ts"), "utf8");

/**
 * A configuração sem os comentários.
 *
 * ⚠️ **Necessário porque o docblock CITA a porta antiga**, e tem de continuar
 * citando: o valor errado escrito com a razão por que saiu é o que impede
 * alguém de voltar a pôr 3000 ali por conveniência. Cobrar a ausência da
 * literal no arquivo inteiro proibiria justamente o registro da lição.
 *
 * Mesma técnica de `test/preparado-para-as-fotos.test.ts`, que conta `priority`
 * só no código pelo mesmo motivo: comentário descreve o padrão, código é que o
 * aplica.
 *
 * ⚠️ E a remoção de comentário de linha é por INÍCIO de linha, não por
 * ocorrência de `//`. Um `/\/\/.*$/` ingênuo cortaria
 * `` `http://localhost:${PORTA}` `` no meio e faria o teste passar por engano
 * — que é o formato de erro que este arquivo existe para impedir.
 */
const CODIGO = CONFIG.replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((linha) => {
    const t = linha.trimStart();
    return !t.startsWith("//") && !t.startsWith("*");
  })
  .join("\n");

const IDENTIDADE = readFileSync(
  join(process.cwd(), "e2e", "e-o-site-deste-cliente.setup.ts"),
  "utf8",
);

describe("o servidor que a suíte local mede", () => {
  it("não é a porta 3000, que nesta máquina é do projeto irmão", () => {
    // Sem âncora de porta nenhuma no arquivo o teste passaria vazio, então a
    // sentinela abaixo cobra que a configuração de servidor continue existindo.
    expect(CODIGO).toMatch(/webServer/);
    expect(CODIGO).not.toMatch(/localhost:3000/);
  });

  it("não deixa literal de porta em NENHUM arquivo da suíte", () => {
    /*
     * ⚠️ Esta asserção nasceu de a anterior não ter bastado. A primeira versão
     * desta guarda lia só `playwright.config.ts`, e havia uma TERCEIRA cópia da
     * porta em `e2e/semeia-cardapio.ts` — `?? "http://localhost:3000"` — que
     * passou batido. Guarda que olha um arquivo prova coisa sobre um arquivo.
     *
     * `e2e/porta.ts` é a exceção declarada: é a fonte, é lá que a porta se
     * escreve uma vez.
     */
    const arquivos = readdirSync(join(process.cwd(), "e2e")).filter(
      (n) => n.endsWith(".ts") && n !== "porta.ts",
    );
    const comLiteral = arquivos.filter((nome) => {
      const fonte = readFileSync(join(process.cwd(), "e2e", nome), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .filter((l) => {
          const t = l.trimStart();
          return !t.startsWith("//") && !t.startsWith("*");
        })
        .join("\n");
      return /localhost:\d+/.test(fonte);
    });
    expect(comLiteral).toEqual([]);
    // Sentinela: se a pasta deixar de ser lida, a lista vem vazia e a asserção
    // acima passa sem ter olhado nada.
    expect(arquivos.length).toBeGreaterThan(5);
  });

  it("usa a MESMA porta para o baseURL e para o servidor", () => {
    /*
     * Duas literais de porta é o formato de defeito que este repositório já
     * pagou três vezes (o `NavKey` com o `pt.json` e as pastas de rota; o
     * `quality` com o `images.qualities`; o `og:image` com o `openGraph` do
     * segmento): dois lugares que precisam concordar e nada que cobre.
     *
     * Uma constante só, usada nos dois, é o que torna a divergência
     * impossível em vez de improvável.
     */
    const literais = CODIGO.match(/localhost:\d+/g) ?? [];
    expect(literais).toEqual([]);
    // E a porta chega de uma fonte só, importada — não redeclarada aqui.
    expect(CODIGO).toMatch(/from "\.\/e2e\/porta"/);
    expect(
      readFileSync(join(process.cwd(), "e2e", "porta.ts"), "utf8"),
    ).toMatch(/export const PORTA/);
  });
});

describe("a confirmação de identidade", () => {
  it("é projeto próprio, encadeado depois do aquecimento", () => {
    /*
     * Três coisas, e cada uma corrige um jeito de a guarda virar decoração:
     *
     * · o `testMatch` tem de apanhar o arquivo — guarda que o Playwright não
     *   casa é guarda que nunca roda, e ninguém volta a olhar para descobrir;
     * · ela roda DEPOIS do aquecimento, senão confere `/privacy` antes de a
     *   rota compilar e reprova por tempo em vez de por identidade;
     * · e os navegadores dependem DELA, não do aquecimento — é isso que
     *   impede asserção nenhuma de rodar contra o site errado.
     */
    expect(CODIGO).toMatch(
      /name:\s*"identidade",\s*testMatch:\s*\/e-o-site-deste-cliente\\\.setup\\\.ts\$\/,\s*dependencies:\s*\["aquecimento"\]/,
    );
    const dependencias = CODIGO.match(/dependencies:\s*\["([^"]+)"\]/g) ?? [];
    expect(dependencias.filter((d) => d.includes("identidade"))).toHaveLength(2);
  });

  it("aquece as páginas legais, que é onde o CNPJ se confere", () => {
    /*
     * ⚠️ Até 16/09 NENHUM spec da suíte visitava `/privacy` ou `/terms` — as
     * duas páginas que precisam estar certas para o site poder ser publicado.
     * A confirmação de identidade lê o CNPJ em `/privacy`, e sem aquecer a
     * rota ela reprovava por compilação em curso.
     */
    const aquecimento = readFileSync(
      join(process.cwd(), "e2e", "aquece.setup.ts"),
      "utf8",
    );
    expect(aquecimento).toMatch(/"\/privacy"/);
    expect(aquecimento).toMatch(/"\/terms"/);
  });

  it("lê as marcas do cliente da configuração, e não de literais copiadas", () => {
    /*
     * Escrever "Restaurante Prato" e o CNPJ aqui dentro criaria uma terceira
     * cópia do dado do cliente — e a guarda passaria a afirmar um valor que
     * ninguém confere quando `siteConfig` mudar. A mesma razão pela qual
     * `test/palette-contrast.test.ts` lê as cores de `siteConfig` em vez de
     * trazer os hexes.
     */
    expect(IDENTIDADE).toMatch(/from "@\/config\/site"|from "@\/content\/legal"/);
    expect(IDENTIDADE).not.toMatch(/Restaurante Prato/);
    expect(IDENTIDADE).not.toMatch(/03\.354\.096/);
  });

  it("falha se a página não responder, em vez de aprovar um vazio", () => {
    // Uma resposta 404 não contém a marca do cliente, então um teste que só
    // procurasse a marca passaria a reprovar por identidade quando o caso real
    // é servidor no ar e rota quebrada. A checagem de status é o que separa as
    // duas mensagens.
    expect(IDENTIDADE).toMatch(/\.ok\(\)|status\(\)/);
  });
});
