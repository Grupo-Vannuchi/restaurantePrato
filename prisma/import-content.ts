/**
 * Restaura o conteúdo a partir de um JSON gerado por `npm run db:export`.
 *
 *   DATABASE_URL="<url>" npm run db:import -- prisma/backups/conteudo-....json
 *   DATABASE_URL="<url>" npm run db:import -- <arquivo> --confirmar
 *
 * **Por que existe.** O `db:export` deste projeto grava JSON, mas o `db:restore`
 * só sabe ler `snapshot.sql` **dentro do contêiner Docker local** — contra o
 * Supabase ele não serve. Sem este arquivo o backup era de mão única: dava para
 * salvar e não dava para voltar, o que só se descobre no dia em que precisa.
 *
 * **Ensaia antes de escrever.** Sem `--confirmar` ele não toca no banco: lê,
 * confere e imprime o que faria. Restaurar é operação que se faz com pressa,
 * depois de já ter perdido alguma coisa, e apontar para o banco errado é o
 * acidente mais fácil de cometer.
 *
 * **Escreve por `upsert`, não por `create`.** Rodar duas vezes tem que dar o
 * mesmo resultado que rodar uma. E não apaga nada: o que existe hoje e não está
 * no arquivo continua lá. Restaurar não deveria ser uma segunda forma de perder
 * dado.
 *
 * ⚠️ **O admin fica de fora.** O arquivo não traz `passwordHash` de propósito
 * (ver `export-content.ts`), então recriar o usuário produziria uma conta
 * impossível de usar e — pior — uma que *parece* existir. O caminho é
 * `npm run db:set-admin`.
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";

/**
 * Ordem de inserção, com a referência antes de quem aponta para ela.
 *
 * Só `menuItems` → `menuCategories` tem chave estrangeira hoje; as demais são
 * independentes. A lista existe explícita mesmo assim, porque a alternativa é
 * depender da ordem em que as chaves aparecem no JSON — que é ordem de escrita,
 * não ordem de dependência, e ninguém garante que continue coincidindo.
 */
const TABELAS_EM_ORDEM = [
  "menuCategories",
  "menuItems",
  "galleryPhotos",
  "informations",
  "testimonials",
  "leads",
  "leadNotificationConfig",
] as const;

/** Tabela reconhecida, mas deliberadamente não restaurada. */
const IGNORADAS = ["adminUsers"];

/** Nome no arquivo → modelo do Prisma. */
const MODELO: Record<string, string> = {
  menuCategories: "menuCategory",
  menuItems: "menuItem",
  galleryPhotos: "galleryPhoto",
  informations: "information",
  testimonials: "testimonial",
  leads: "lead",
  leadNotificationConfig: "leadNotificationConfig",
};

/**
 * O arquivo é o que diz ser?
 *
 * Devolve a lista de problemas — vazia quando está íntegro. Lista, e não
 * exceção no primeiro erro, para quem restaura ver tudo o que está errado de
 * uma vez em vez de descobrir um por rodada.
 */
export function validarExportacao(valor: unknown): string[] {
  if (typeof valor !== "object" || valor === null) {
    return ["O arquivo não contém um objeto JSON."];
  }
  const obj = valor as Record<string, unknown>;
  const erros: string[] = [];

  if (typeof obj.exportadoEm !== "string") {
    erros.push("Falta o campo `exportadoEm` — isto não parece uma exportação deste projeto.");
  }
  const dados = obj.dados;
  const contagens = obj.contagens;
  if (typeof dados !== "object" || dados === null) {
    erros.push("Falta o campo `dados`.");
  }
  if (typeof contagens !== "object" || contagens === null) {
    erros.push("Falta o campo `contagens`.");
  }
  if (erros.length > 0) return erros;

  // A contagem existe para o arquivo se auto-conferir. Download interrompido ou
  // arquivo colado pela metade chega com a promessa e sem o conteúdo, e
  // restaurar isso em silêncio apaga a diferença sem ninguém ver.
  for (const [tabela, esperado] of Object.entries(contagens as Record<string, unknown>)) {
    const linhas = (dados as Record<string, unknown>)[tabela];
    const real = Array.isArray(linhas) ? linhas.length : 0;
    if (esperado !== real) {
      erros.push(
        `Arquivo inconsistente em \`${tabela}\`: a contagem diz ${esperado}, o conteúdo tem ${real}.`,
      );
    }
  }
  return erros;
}

/** Tabelas presentes no arquivo, na ordem em que podem entrar no banco. */
export function ordemDeInsercao(dados: Record<string, unknown[]>): string[] {
  for (const tabela of Object.keys(dados)) {
    if (!TABELAS_EM_ORDEM.includes(tabela as (typeof TABELAS_EM_ORDEM)[number]) &&
        !IGNORADAS.includes(tabela)) {
      throw new Error(
        `Tabela desconhecida no arquivo: \`${tabela}\`. Recusando escrever às cegas.`,
      );
    }
  }
  return TABELAS_EM_ORDEM.filter((t) => t in dados);
}

async function main() {
  const args = process.argv.slice(2);
  const caminho = args.find((a) => !a.startsWith("--"));
  const confirmar = args.includes("--confirmar");

  if (!caminho) {
    console.error("Uso: npm run db:import -- <arquivo.json> [--confirmar]");
    process.exit(1);
  }

  const conteudo = JSON.parse(readFileSync(caminho, "utf8"));
  const erros = validarExportacao(conteudo);
  if (erros.length > 0) {
    console.error(`Arquivo recusado (${caminho}):`);
    for (const e of erros) console.error(`  • ${e}`);
    process.exit(1);
  }

  const dados = conteudo.dados as Record<string, unknown[]>;
  const ordem = ordemDeInsercao(dados);

  console.log(`Arquivo:    ${caminho}`);
  console.log(`Exportado:  ${conteudo.exportadoEm}`);
  console.log(`Modo:       ${confirmar ? "ESCRITA" : "ensaio (nada será gravado)"}\n`);

  const prisma = new PrismaClient();
  try {
    for (const tabela of ordem) {
      const linhas = dados[tabela] ?? [];
      if (!confirmar) {
        console.log(`  ${tabela.padEnd(24)} ${String(linhas.length).padStart(4)} a gravar`);
        continue;
      }
      // `upsert` linha a linha, e não `createMany`: rodar duas vezes precisa dar
      // o mesmo resultado que rodar uma.
      const delegate = (prisma as unknown as Record<string, {
        upsert: (a: unknown) => Promise<unknown>;
      }>)[MODELO[tabela]];
      for (const linha of linhas as Record<string, unknown>[]) {
        await delegate.upsert({
          where: { id: linha.id },
          create: linha,
          update: linha,
        });
      }
      console.log(`  ${tabela.padEnd(24)} ${String(linhas.length).padStart(4)} gravadas`);
    }

    for (const ignorada of IGNORADAS.filter((t) => t in dados)) {
      console.log(
        `\n⚠️  \`${ignorada}\` ficou de fora: o backup não traz o hash da senha.` +
          `\n    Para recriar o acesso: npm run db:set-admin`,
      );
    }
    if (!confirmar) {
      console.log("\nEnsaio. Para gravar de verdade, repita com --confirmar.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

/** Só executa quando chamado como script — ver a mesma guarda em `export-content.ts`. */
const executadoDiretamente =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (executadoDiretamente) {
  main().catch((erro) => {
    console.error("Falha ao restaurar:", erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
}
