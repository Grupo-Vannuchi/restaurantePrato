import { beforeEach, describe, expect, it, vi } from "vitest";

import { siteConfig, fullAddress } from "@/config/site";

/**
 * O `/llms.txt` publica fatos citáveis, e nenhum deles é inventado.
 *
 * A seção de fatos existe porque um modelo que responde "onde almoçar no Centro
 * de Santos" não navega o site: ele cita o trecho que conseguir extrair inteiro.
 * Isso faz dela **o pior lugar possível para um palpite** — um dado errado ali
 * volta na boca de um assistente, como se fosse a casa falando.
 *
 * Por isso esta guarda verifica três coisas diferentes:
 *
 * 1. **Os fatos estão lá**, e vindos da configuração — não de texto digitado.
 * 2. **Nada vaza**: sem `undefined`, sem `NaN`, sem `R$` sem número, sem
 *    `«PENDENTE»`. Uma interpolação que falha produz exatamente esse tipo de
 *    lixo, e num arquivo de texto puro ninguém vê.
 * 3. **A linha de preço só existe quando o preço existe** — e existe quando ele
 *    chega. É a metade que costuma não ser testada: hoje `menuPricing` está
 *    vazio, então o caminho COM preço estrearia em produção, no dia em que
 *    alguém preencher uma linha de configuração, sem nunca ter rodado.
 *
 * ⚠️ **O `@/config/menu` é mockado por inteiro, e não parcialmente.**
 * `precoDoBuffet()` lê `menuPricing.buffetPerKg` como valor PADRÃO de parâmetro,
 * resolvido dentro do módulo dele: sobrescrever só o export `menuPricing` num
 * mock parcial não mudaria nada, porque a função real continua lendo o objeto
 * real. Trocar o módulo todo é o que permite exercitar as duas pontas — e é a
 * mesma razão pela qual `PriceCallout` recebe os preços por parâmetro em vez de
 * lê-los da configuração.
 */
const ENV = { SITE_INDEXABLE: true, NEXT_PUBLIC_SITE_URL: "https://exemplo.test" };

/** Duas categorias com pratos, para a contagem ter o que contar. */
const QUERIES = {
  getMenu: async () => [
    {
      slug: "principais",
      name: "Principais",
      description: "Do dia",
      items: [{ id: "1" }, { id: "2" }, { id: "3" }],
    },
    { slug: "saladas", name: "Saladas", description: "Frias", items: [{ id: "4" }] },
  ],
};

/** O `@/config/menu` como está hoje: sem nenhum preço vindo do cliente. */
const MENU_SEM_PRECO = {
  formatBRL: (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`,
  menuPricing: { buffetPerKg: undefined, pasta: undefined },
  pastaChoices: {
    shapes: ["a", "b", "c"],
    preparation: ["d", "e"],
    sauces: ["f", "g", "h", "i"],
    ingredientLimit: 5,
    portion: "190 g",
  },
  precoDoBuffet: () => null,
  precoDaMassa: () => null,
};

/** O mesmo módulo no dia em que os dois preços chegarem. */
const MENU_COM_PRECO = {
  ...MENU_SEM_PRECO,
  menuPricing: { buffetPerKg: 105.9, pasta: 41.9 },
  precoDoBuffet: () => "R$ 105,90/kg",
  precoDaMassa: () => "R$ 41,90",
};

async function texto(menu: object): Promise<string> {
  vi.resetModules();
  vi.doMock("@/lib/env", () => ({ env: ENV }));
  vi.doMock("@/lib/queries", () => QUERIES);
  vi.doMock("@/config/menu", () => menu);
  const { GET } = (await import("@/app/llms.txt/route")) as {
    GET: () => Promise<Response>;
  };
  return (await GET()).text();
}

beforeEach(() => {
  vi.resetModules();
  vi.doUnmock("@/lib/env");
  vi.doUnmock("@/lib/queries");
  vi.doUnmock("@/config/menu");
});

describe("os fatos do /llms.txt", () => {
  it("publicam o que está confirmado, tirado da configuração", async () => {
    const saida = await texto(MENU_SEM_PRECO);

    expect(saida).toContain("## Fatos");

    // Endereço e horário vêm dos helpers, não de texto escrito na rota: se
    // alguém mudar a rua em `site.ts`, esta asserção acompanha sozinha.
    expect(saida).toContain(fullAddress());
    expect(saida).toContain(String(siteConfig.foundedYear));
    for (const cozinha of siteConfig.servesCuisine ?? []) {
      expect(saida.toLowerCase()).toContain(cozinha.toLowerCase());
    }

    /*
     * Os fatos NEGATIVOS, que são metade do valor da lista: sem eles o modelo
     * preenche a lacuna com o que é comum no ramo e manda alguém almoçar aqui
     * num domingo, ou ligar para um telefone que não existe.
     */
    expect(saida).toContain("Não abre sábado nem domingo");
    /*
     * ⚠️ A correção da razão social é dita pelo lado POSITIVO, e não é escolha
     * de estilo: a palavra que nomearia o erro está proibida em `src/` inteiro
     * por `test/copy-hygiene.test.ts`, sem exceção para uso negativo. A primeira
     * versão desta linha usava a palavra na negativa e foi essa guarda que a
     * pegou — ela tem razão em não abrir exceção, porque existe justamente
     * porque a copy antiga usava o termo de forma afirmativa.
     */
    expect(saida).toContain('Apesar da razão social registrada como "Coffee Shop"');
    expect(saida).toContain("não é rodízio");
    expect(saida).toContain("Não tem telefone fixo");

    // A contagem de pratos sai do banco: quatro itens nas duas categorias.
    expect(saida).toContain("4 pratos");
  });

  it("não publicam o que o cliente ainda não confirmou", async () => {
    const saida = await texto(MENU_SEM_PRECO);

    // As duas linhas de preço somem inteiras enquanto o valor não vem — em vez
    // de sair "a partir de" ou "consulte", que seria inventar.
    expect(saida).not.toContain("custa");

    /*
     * ⚠️ E o texto não pode conter nenhum resto de interpolação falha. Num
     * arquivo de texto puro isto não aparece como erro: aparece como um fato
     * esquisito que uma IA vai citar com toda a confiança.
     */
    for (const lixo of ["undefined", "NaN", "«PENDENTE", "[object", "null"]) {
      expect(saida, `o /llms.txt contém "${lixo}"`).not.toContain(lixo);
    }
    // `R$` sem número em seguida é o mesmo problema, com outra cara.
    expect(saida).not.toMatch(/R\$\s*(?![0-9])/);

    // Dados que o Prato NÃO confirmou e que o projeto irmão publica: número de
    // lugares, meios de pagamento e ponto de referência. Nenhum pode aparecer
    // aqui por analogia com o vizinho.
    for (const naoConfirmado of ["lugares", "cartão", "estacionamento", "Pix"]) {
      expect(
        saida,
        `o /llms.txt afirma "${naoConfirmado}", que o cliente não confirmou`,
      ).not.toContain(naoConfirmado);
    }
  });

  it("ganham a linha de preço no dia em que o preço chegar", async () => {
    const saida = await texto(MENU_COM_PRECO);

    // ⚠️ A frase é conferida INTEIRA de propósito. A primeira versão dizia
    // "O quilo do buffet custa {precoDoBuffet()}", e o helper já devolve
    // "R$ 105,90/kg": sairia "o quilo … o quilo". Um teste que só procurasse
    // "105,90" teria passado por cima disso.
    expect(saida).toContain("O buffet custa R$ 105,90/kg.");
    expect(saida).toContain("A porção da ilha de massas custa R$ 41,90.");

    // Sentinela do par: o mesmo arquivo, sem preço, não traz nenhuma das duas.
    const semPreco = await texto(MENU_SEM_PRECO);
    expect(semPreco).not.toContain("O buffet custa");
    expect(semPreco).not.toContain("A porção da ilha");
  });
});
