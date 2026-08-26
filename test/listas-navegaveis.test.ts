import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Os nomes dos registros não eram cabeçalhos, e por isso não davam para saltar.
 *
 * Em toda lista do painel — cardápio, novidades, depoimentos, contatos,
 * instâncias — o nome de cada registro era um `<span className="font-semibold">`.
 * Visualmente é um título; para a tecnologia assistiva não é nada.
 *
 * Isso importa porque saltar por cabeçalho (tecla `H`) é o modo padrão de varrer
 * uma tela longa. Sem eles, percorrer 30 contatos significa dezenas de `Tab` ou
 * seta por item — e cada `<li>` da tela de contatos tem nome, dois selos,
 * e-mail, data, mensagem, origem, etiquetas e três botões.
 *
 * O nível não é decorativo: precisa continuar a hierarquia que a página já tem.
 * Na tela de contatos, por exemplo, já existe um `<h2>` (a configuração de
 * notificação), então os contatos são irmãos dele.
 *
 * ⚠️ Estas páginas são componentes de servidor `async` e não renderizam com a
 * biblioteca de testes — a verificação é na fonte. Limitação do arnês.
 */
const PAGINAS = join(process.cwd(), "src", "app", "[locale]", "admin", "(dashboard)");
const COMPONENTES = join(process.cwd(), "src", "components", "admin");

const semComentarios = (caminho: string) =>
  readFileSync(caminho, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

/** Cada tela, com o nível que o nome do registro tem que ter. */
const ESPERADO: { arquivo: string; nivel: string; oQue: string }[] = [
  { arquivo: join(PAGINAS, "cardapio", "page.tsx"), nivel: "h2", oQue: "nome da categoria" },
  { arquivo: join(PAGINAS, "cardapio", "page.tsx"), nivel: "h3", oQue: "nome do item" },
  { arquivo: join(PAGINAS, "novidades", "page.tsx"), nivel: "h2", oQue: "título da novidade" },
  { arquivo: join(PAGINAS, "testimonials", "page.tsx"), nivel: "h2", oQue: "autor do depoimento" },
  { arquivo: join(PAGINAS, "leads", "page.tsx"), nivel: "h2", oQue: "nome do contato" },
  { arquivo: join(PAGINAS, "galeria", "page.tsx"), nivel: "h2", oQue: "legenda da foto" },
  { arquivo: join(PAGINAS, "page.tsx"), nivel: "h3", oQue: "contato recente" },
  { arquivo: join(COMPONENTES, "whatsapp-manager.tsx"), nivel: "h3", oQue: "nome da instância" },
];

describe("as listas do painel", () => {
  for (const { arquivo, nivel, oQue } of ESPERADO) {
    it(`usa ${nivel} para o ${oQue}`, () => {
      // Classe literal em vez de `\s`: dentro de template literal o escape some.
      expect(semComentarios(arquivo)).toMatch(new RegExp(`<${nivel}[ >]`));
    });
  }

  it("o nome da instância é o h3, e não outro h3 qualquer do arquivo", () => {
    // A primeira versão desta guarda só perguntava "existe `<h3` no arquivo?" —
    // e passava por engano, porque o `whatsapp-manager` já tinha um h3: o
    // título da janela do QR Code. Guarda genérica demais aprova o defeito.
    const fonte = semComentarios(join(COMPONENTES, "whatsapp-manager.tsx"));
    expect(fonte).toMatch(/<h3[^>]*>\{inst\.name\}<\/h3>/);
  });

  it("nenhuma finge cabeçalho com span em negrito", () => {
    const fingindo = ESPERADO.map((e) => e.arquivo)
      .filter((c, i, todos) => todos.indexOf(c) === i)
      .filter((c) => /<span className="font-semibold"/.test(semComentarios(c)));

    expect(fingindo).toEqual([]);
  });
});

describe("a cor de significado nas PÁGINAS do painel", () => {
  // A guarda de cor crua só varria `src/components/admin/`. As páginas ficaram
  // de fora, e sobrou um `text-emerald-600` no selo de contato respondido —
  // 3,40:1 sobre o card claro, reprovado. Terceiro furo da mesma guarda hoje:
  // primeiro só olhava `text-`, depois só olhava atributos, agora só olhava uma
  // pasta.
  const SEMANTICAS = /^(?:text|border|bg)-(?:red|emerald|amber)-\d{3}(?:\/\d+)?$/;
  const INTERACAO = /(?:^|:)(?:hover|focus|focus-visible|group-hover|active):/;

  it("nenhuma página usa cor crua do Tailwind para estado", () => {
    const crus = ESPERADO.map((e) => e.arquivo)
      .filter((c, i, todos) => todos.indexOf(c) === i)
      .map((c) => ({
        arquivo: c.slice(c.indexOf("src")),
        classes: [...readFileSync(c, "utf8").matchAll(/"([^"]*)"/g)]
          .flatMap((m) => m[1]!.split(/\s+/))
          .filter((cl) => !INTERACAO.test(cl) && SEMANTICAS.test(cl.split(":").pop() ?? "")),
      }))
      .filter((x) => x.classes.length > 0);

    expect(crus).toEqual([]);
  });
});
