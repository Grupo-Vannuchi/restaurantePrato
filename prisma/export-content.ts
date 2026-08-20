/**
 * Exporta o conteúdo do banco para um JSON datado.
 *
 *   DATABASE_URL="<url do banco>" npm run db:export
 *
 * **Por que isto existe, se o Supabase tem backup próprio.** O backup do
 * provedor serve para catástrofe — banco corrompido, projeto apagado. Ele não
 * serve para o acidente comum, que é alguém excluir uma categoria do cardápio
 * com trinta pratos dentro (`onDelete: Cascade`) numa terça-feira. Restaurar um
 * backup inteiro do provedor para desfazer isso é canhão para mosquito, e nem
 * sempre está disponível no plano gratuito.
 *
 * **Por que JSON e não `pg_dump`.** O `pg_dump` não está instalado nesta
 * máquina — o `db:dump` do projeto só funciona porque roda dentro do contêiner
 * Docker, e contra o Supabase não serve. Este script fala com o banco pelo
 * Prisma, que já é dependência, e roda em qualquer lugar que rode o projeto.
 *
 * ⚠️ **O arquivo gerado contém dado pessoal** — os contatos trazem nome,
 * e-mail, telefone e mensagem de quem escreveu pelo site. Ele nasce em
 * `prisma/backups/`, que o `.gitignore` cobre, e **não pode** ser versionado:
 * este repositório é público. Trate o arquivo como trata a senha do banco.
 *
 * O hash da senha do admin fica **de fora** de propósito. Sem ele o arquivo
 * deixa de ser material de invasão, e a perda é nenhuma: recriar o acesso é um
 * comando (`npm run db:set-admin`), enquanto um hash vazado é permanente.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type ConteudoExportado = {
  exportadoEm: string;
  contagens: Record<string, number>;
  dados: Record<string, unknown[]>;
};

/**
 * Monta o objeto exportado a partir das tabelas já lidas.
 *
 * Separado da leitura do banco de propósito: assim a forma do arquivo — que é
 * o contrato de quem for restaurar — pode ser verificada sem um banco de pé.
 */
export function montarExportacao(
  dados: Record<string, unknown[]>,
  agora: Date,
): ConteudoExportado {
  const contagens = Object.fromEntries(
    Object.entries(dados).map(([tabela, linhas]) => [tabela, linhas.length]),
  );
  return { exportadoEm: agora.toISOString(), contagens, dados };
}

/** Nome do arquivo: ordenável por data, legível por humano. */
export function nomeDoArquivo(agora: Date): string {
  const iso = agora.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `conteudo-${iso}.json`;
}

async function main() {
  const dados: Record<string, unknown[]> = {
    menuCategories: await prisma.menuCategory.findMany({ orderBy: { order: "asc" } }),
    menuItems: await prisma.menuItem.findMany({ orderBy: { order: "asc" } }),
    galleryPhotos: await prisma.galleryPhoto.findMany({ orderBy: { order: "asc" } }),
    informations: await prisma.information.findMany({ orderBy: { order: "asc" } }),
    testimonials: await prisma.testimonial.findMany({ orderBy: { order: "asc" } }),
    leads: await prisma.lead.findMany({ orderBy: { createdAt: "asc" } }),
    leadNotificationConfig: await prisma.leadNotificationConfig.findMany(),
    // Sem `passwordHash`: ver o aviso no topo.
    adminUsers: await prisma.adminUser.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
  };

  const agora = new Date();
  const saida = montarExportacao(dados, agora);
  const pasta = join(process.cwd(), "prisma", "backups");
  mkdirSync(pasta, { recursive: true });
  const caminho = join(pasta, nomeDoArquivo(agora));
  writeFileSync(caminho, JSON.stringify(saida, null, 2) + "\n", "utf8");

  const total = Object.values(saida.contagens).reduce((a, b) => a + b, 0);
  console.log(`Exportado para ${caminho}`);
  for (const [tabela, n] of Object.entries(saida.contagens)) {
    console.log(`  ${tabela.padEnd(24)} ${n}`);
  }
  console.log(`  ${"total".padEnd(24)} ${total}`);
  if (saida.contagens.leads > 0) {
    console.log(
      "\n⚠️  O arquivo contém dados pessoais dos contatos. Não versione, não anexe em chat.",
    );
  }
}

/**
 * Só executa quando chamado como script.
 *
 * Sem esta guarda, importar o módulo — o que o teste do formato faz — abriria
 * conexão com o banco e derrubaria o processo. Um arquivo que faz trabalho ao
 * ser importado é um arquivo que não dá para testar.
 */
const executadoDiretamente =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (executadoDiretamente) {
  main()
    .catch((erro) => {
      console.error("Falha ao exportar:", erro instanceof Error ? erro.message : erro);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
