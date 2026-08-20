import { pathToFileURL } from "node:url";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Creates (or resets) the single admin user. This is the *only* thing this
 * seed does: cardápio, galeria, avaliações and novidades are the
 * restaurant's real content, entered through the admin panel — seeding demo
 * rows for them would mean inventing content on a real client's site.
 *
 * ⚠️ SEGURANÇA: este seed cai numa senha padrão pública quando
 * `SEED_ADMIN_PASSWORD` não está definida — e o `upsert` abaixo tem ramo
 * `update`, então rodar contra um banco real **sobrescreve a senha do admin
 * que já existe**. Não é criar um usuário fraco: é tomar a conta do cliente
 * com uma senha que está num repositório público.
 *
 * Desde 20/08/2026 isso deixou de ser aviso e virou recusa: `impedimentoParaSemear`
 * barra o seed quando `DATABASE_URL` não aponta para um banco local e as
 * variáveis `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` não foram declaradas.
 * Para trocar a senha de um admin existente sem semear, use
 * `npm run db:set-admin` (lê `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
 */
/**
 * Endereços de banco que só existem na máquina de quem roda.
 *
 * A checagem é pelo endereço, e não por `NODE_ENV`: isto é uma ferramenta de
 * linha de comando, e `NODE_ENV` quase nunca está definida na hora em que
 * alguém digita o comando errado.
 */
const HOSTS_LOCAIS = ["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"];

/** O `DATABASE_URL` aponta para a máquina de quem está rodando? */
export function ehBancoLocal(databaseUrl: string | undefined): boolean {
  if (!databaseUrl) return false;
  try {
    return HOSTS_LOCAIS.includes(new URL(databaseUrl).hostname);
  } catch {
    // URL ilegível responde "não é local" de propósito: errar para "é local"
    // libera a senha padrão contra um banco desconhecido; errar para o outro
    // lado só exige uma variável a mais de quem está em casa.
    return false;
  }
}

/**
 * Por que este seed não pode rodar — ou `null` quando pode.
 *
 * O que transforma isto de "usuário fraco" em "conta tomada": o `upsert`
 * abaixo tem ramo `update`, que **troca a senha de um admin que já existe**.
 * Rodar apontado para produção sem `SEED_ADMIN_PASSWORD` não cria um segundo
 * usuário — reescreve o do cliente com uma senha que está no repositório
 * público.
 */
export function impedimentoParaSemear(
  databaseUrl: string | undefined,
  email: string | undefined,
  senha: string | undefined,
): string | null {
  if (ehBancoLocal(databaseUrl)) return null;

  const faltando = [
    senha ? null : "SEED_ADMIN_PASSWORD",
    email ? null : "SEED_ADMIN_EMAIL",
  ].filter((v): v is string => v !== null);
  if (faltando.length === 0) return null;

  return (
    `DATABASE_URL não aponta para um banco local, e falta ${faltando.join(" e ")}. ` +
    `Este seed usa upsert: sem senha explícita ele sobrescreve a senha do admin ` +
    `que já existe pela padrão, que está no repositório público. Defina as ` +
    `variáveis, ou use \`npm run db:set-admin\` para trocar a senha sem semear.`
  );
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: { email, name: "Admin", passwordHash, role: "ADMIN" },
  });
  console.log(`✓ Admin user ready: ${email}`);
}

async function main() {
  const impedimento = impedimentoParaSemear(
    process.env.DATABASE_URL,
    process.env.SEED_ADMIN_EMAIL,
    process.env.SEED_ADMIN_PASSWORD,
  );
  if (impedimento) throw new Error(impedimento);

  await seedAdmin();
}

/**
 * Só executa quando chamado como script — mesma guarda de `export-content.ts`.
 *
 * Sem ela, **importar** este arquivo semeia o banco. O teste da guarda importa,
 * e o ramo de falha chama `process.exit(1)`: um arquivo que trabalha ao ser
 * importado derruba quem só queria lê-lo. O `prisma db seed` roda
 * `tsx prisma/seed.ts`, então continua entrando aqui.
 */
const executadoDiretamente =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (executadoDiretamente) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e instanceof Error ? e.message : e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
