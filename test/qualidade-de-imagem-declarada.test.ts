import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Toda `quality` usada num componente precisa estar na lista do `next.config`.
 *
 * ⚠️ **No Next 16 a lista `images.qualities` é obrigatória, e o que ficar fora
 * dela é ignorado EM SILÊNCIO.** O padrão é `[75]`. Um `quality={50}` num
 * componente não vira erro de compilação, não vira aviso no build e não vira
 * aviso no navegador: a URL sai com `q=75`, a imagem sai do tamanho de sempre,
 * e quem escreveu conclui que qualidade não afeta o peso.
 *
 * Foi exatamente o que aconteceu em 04/09, medindo o hero da home. Duas rodadas
 * inteiras de build e medição disseram que baixar a qualidade não mudava nada —
 * porque o valor nunca chegava ao otimizador. Só depois de ler
 * `node_modules/next/dist/docs/` é que o motivo apareceu. Declarada a lista, o
 * hero foi de 141 KB para 49 e o LCP no celular caiu de 3288 para 1628 ms.
 *
 * O campo virou obrigatório por segurança, e não por capricho: sem lista,
 * alguém de fora pediria mil qualidades diferentes na URL e cada uma viraria um
 * arquivo novo no cache do servidor.
 *
 * Esta guarda existe porque o modo de falhar não tem sintoma. Um número novo
 * escrito num componente vale silenciosamente 75, e a única forma de descobrir
 * é medir o peso da imagem e estranhar — que é o que ninguém faz.
 */
const RAIZ = join(process.cwd(), "src");
const CONFIG = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = join(dir, e.name);
    if (e.isDirectory()) return arquivos(caminho);
    return [".ts", ".tsx"].includes(extname(e.name)) ? [caminho] : [];
  });
}

/** Os valores declarados em `images.qualities`. */
function declaradas(): number[] {
  const m = /qualities:\s*\[([^\]]*)\]/.exec(CONFIG);
  if (!m) return [];
  return m[1]!
    .split(",")
    .map((n) => Number(n.trim()))
    .filter((n) => Number.isFinite(n));
}

/** Cada `quality={N}` escrito num componente. */
function usadas(): { arquivo: string; valor: number }[] {
  const achados: { arquivo: string; valor: number }[] = [];
  for (const caminho of arquivos(RAIZ)) {
    const fonte = readFileSync(caminho, "utf8");
    for (const m of fonte.matchAll(/quality=\{(\d+)\}/g)) {
      achados.push({
        arquivo: relative(process.cwd(), caminho).replace(/\\/g, "/"),
        valor: Number(m[1]),
      });
    }
  }
  return achados;
}

describe("a qualidade de imagem", () => {
  const lista = declaradas();

  it("está declarada em `images.qualities`, que o Next 16 exige", () => {
    // Sentinela: sem a lista, a comparação abaixo passaria por vacuidade e a
    // guarda diria que está tudo certo sobre uma configuração que não existe.
    expect(lista.length, "não achei `qualities` em next.config.ts").toBeGreaterThan(0);
    expect(lista).toContain(75); // o padrão do Next, usado por toda imagem sem prop
  });

  it("todo valor escrito num componente está na lista", () => {
    const fora = usadas()
      .filter((u) => !lista.includes(u.valor))
      .map((u) => `${u.arquivo}: quality={${u.valor}}`);

    expect(
      fora,
      fora.length
        ? `Estes valores não estão em \`images.qualities\` (${lista.join(", ")}) e o Next ` +
            `os IGNORA sem avisar — a imagem sai em 75:\n  ${fora.join("\n  ")}`
        : "",
    ).toEqual([]);
  });
});
