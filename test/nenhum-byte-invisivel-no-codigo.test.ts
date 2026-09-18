import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nenhum byte de controle invisível no código-fonte.
 *
 * ⚠️ **Esta guarda existe porque a armadilha não aparece na tela.** Em 18/09/2026
 * um regex escrito por heredoc de Python virou
 * `/qualities:\s*\[[^\]]*<0x08>50<0x08>/` — o `\b` que devia ser dois
 * caracteres (borda de palavra) foi convertido num BYTE 0x08, backspace
 * literal, porque `\b` É escape válido em Python. O `\s` ao lado sobreviveu só
 * por NÃO ser escape reconhecido, e o aviso que o interpretador deu falava
 * dele, não do culpado.
 *
 * O que torna isso caro: `cat`, o editor e a ferramenta de leitura não
 * desenham o byte. A linha parecia exatamente correta, o `grep` pelo valor
 * achava a declaração no `next.config.ts`, o mesmo regex digitado à mão casava
 * no Node — e o teste reprovava. Só `od -c` mostrou.
 *
 * Aconteceu duas vezes: a segunda foi numa NOTA que um eu anterior escreveu
 * avisando que a barra invertida não sobrevive às camadas de escape, e o `\b`
 * da própria nota virou backspace. Guardar isso na memória não funcionou.
 *
 * ⚠️ **E o byte NUL tem uma consequência que ninguém procura: o Git passa a
 * tratar o arquivo como BINÁRIO.** `src/lib/safe-link.ts` — o sanitizador que
 * decide se um destino pode virar `href` — nasceu em `69c86a1` com um NUL
 * dentro, e o diff daquele commit diz `Binary files /dev/null and
 * b/src/lib/safe-link.ts differ`, com **0 inserções e 0 remoções**. Uma
 * correção de XSS entrou no repositório impossível de revisar no próprio diff,
 * fora do `git blame` e invisível para qualquer ferramenta de revisão. Era um
 * byte, e custou a revisibilidade de um arquivo de segurança.
 *
 * O padrão varre tudo menos `\t`, `\n` e `\r`, que são legítimos.
 */
const RAIZES = ["src", "test", "e2e", "scripts", "prisma"];

/** Extensões de texto. Binário fica fora — PNG e JPG são cheios destes bytes. */
const TEXTO = new Set([
  ".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx", ".json", ".css", ".md", ".prisma",
]);

const IGNORADOS = new Set(["node_modules", ".next", "migrations", "backups"]);

function arquivosDeTexto(raiz: string, achados: string[] = []): string[] {
  let entradas: string[];
  try {
    entradas = readdirSync(raiz);
  } catch {
    return achados;
  }
  for (const entrada of entradas) {
    if (IGNORADOS.has(entrada)) continue;
    const caminho = join(raiz, entrada);
    if (statSync(caminho).isDirectory()) arquivosDeTexto(caminho, achados);
    else if (TEXTO.has(extname(entrada))) achados.push(caminho);
  }
  return achados;
}

describe("o código-fonte não carrega byte invisível", () => {
  const arquivos = RAIZES.flatMap((r) => arquivosDeTexto(join(process.cwd(), r)));

  it("varre uma quantidade de arquivos que faz sentido", () => {
    // Sentinela: sem ela, um erro de caminho faria a varredura aprovar zero
    // arquivos em silêncio — o mesmo formato de falha que ela vigia.
    expect(arquivos.length).toBeGreaterThan(150);
  });

  it("não tem caractere de controle fora de tab, nova linha e retorno", () => {
    const suspeito = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
    const culpados: string[] = [];

    for (const caminho of arquivos) {
      const texto = readFileSync(caminho, "utf8");
      texto.split("\n").forEach((linha, i) => {
        const achado = linha.match(suspeito);
        if (!achado) return;
        const codigo = achado[0].codePointAt(0)?.toString(16).padStart(2, "0");
        culpados.push(`${relative(process.cwd(), caminho)}:${i + 1} (0x${codigo})`);
      });
    }

    expect(culpados, "byte de controle no código — use `od -c` na linha").toEqual([]);
  });
});
