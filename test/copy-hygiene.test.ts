import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

const catalog = readFileSync(
  join(process.cwd(), "src/messages/pt.json"),
  "utf8",
);

const TEXT_EXT = new Set([".ts", ".tsx", ".json", ".css", ".mjs", ".md", ".txt"]);

/** Arquivos de texto sob um caminho, que pode ser arquivo ou pasta. */
function walk(target: string): string[] {
  const full = join(process.cwd(), target);
  if (statSync(full).isFile()) {
    return TEXT_EXT.has(extname(full)) ? [full] : [];
  }
  return readdirSync(full).flatMap((entry) => walk(join(target, entry)));
}

describe("higiene da copy", () => {
  it("não usa emoji em nenhuma string do catálogo", () => {
    // Decisão de 19/08 (§3.5 do spec): o guia de tom de voz do cliente
    // recomenda emoji, mas o site do qual este repo é fork nunca usou, e o
    // catálogo inteiro é lido por metadata, `llms.txt` e imagem OG — onde
    // emoji vira ruído no resultado de busca. O único emoji legítimo do
    // projeto está em `src/lib/lead-notify.ts`, que é mensagem operacional
    // enviada AO restaurante, não copy do site.
    const found = [...catalog.matchAll(/\p{Extended_Pictographic}/gu)].map(
      (m) => m[0],
    );
    expect(found).toEqual([]);
  });

  it("não descreve a casa como cafeteria", () => {
    // Decisão de 19/08: o Prato é restaurante de almoço — buffet e churrasco
    // na brasa. A razão social registrada diz "COFFEE SHOP", e por isso o
    // termo proibido aqui é "cafeteria", não "coffee": `legalName` e o e-mail
    // `pratocoffee@` são registro, e ficam.
    const targets = ["src", "README.md", "AGENTS.md", "CLAUDE.md", "SECURITY.md"];
    const offenders = targets
      .flatMap((target) => walk(target))
      .filter((file) => /cafeteria/i.test(readFileSync(file, "utf8")))
      .map((file) => file.replace(process.cwd(), ""));
    expect(offenders).toEqual([]);
  });
});

describe("travessão na copy", () => {
  /**
   * Decisão do cliente em 26/08: travessão fora da copy.
   *
   * O motivo dado foi direto, e é o mesmo que o prompt de escrita registra:
   * travessão usado como recurso de estilo, para emendar duas ideias no lugar
   * de um ponto ou de uma conjunção, virou marca registrada de texto gerado por
   * máquina. Num site de restaurante de bairro, isso soa a folheto genérico.
   *
   * A troca não é mecânica. Trocar todo travessão por ponto produz frase picada
   * ("Churrasco na brasa. O barulho da carne chiando.") — que é o outro vício
   * que o mesmo prompt manda evitar. Cada ocorrência virou vírgula, dois-pontos
   * ou conjunção, conforme o que a frase pedia.
   *
   * ⚠️ Vale só para o CATÁLOGO, que é o texto que o visitante lê. Comentário de
   * código e documentação seguem livres: ali o travessão é pontuação legítima,
   * e a regra é sobre a voz da marca, não sobre a língua portuguesa.
   */
  const TRAVESSOES = /[—–]/;

  function textos(valor: unknown, caminho: string): [string, string][] {
    if (typeof valor === "string") return [[caminho, valor]];
    if (Array.isArray(valor)) {
      return valor.flatMap((v, i) => textos(v, `${caminho}[${i}]`));
    }
    if (valor && typeof valor === "object") {
      return Object.entries(valor).flatMap(([k, v]) =>
        textos(v, caminho ? `${caminho}.${k}` : k),
      );
    }
    return [];
  }

  it("nenhuma mensagem do catálogo usa travessão", () => {
    const catalogo = JSON.parse(catalog) as Record<string, unknown>;
    const comTravessao = textos(catalogo, "")
      .filter(([, texto]) => TRAVESSOES.test(texto))
      .map(([caminho]) => caminho);

    expect(comTravessao).toEqual([]);
  });

  it("continua havendo catálogo para varrer — senão a guarda não guarda", () => {
    expect(textos(JSON.parse(catalog), "").length).toBeGreaterThan(100);
  });
});
