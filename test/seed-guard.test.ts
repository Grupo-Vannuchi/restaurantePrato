import { describe, expect, it } from "vitest";

import { ehBancoLocal, impedimentoParaSemear } from "../prisma/seed";

/**
 * O seed não pode encostar num banco que não seja o da máquina de quem roda.
 *
 * `prisma/seed.ts` cria o admin e cai numa senha padrão pública
 * (`changeme123`) quando `SEED_ADMIN_PASSWORD` não está definida. O aviso
 * estava no topo do arquivo, em maiúsculas, e aviso não impede ninguém.
 *
 * O detalhe que transforma isto de "usuário fraco" em "conta tomada": o seed
 * usa `upsert`, e o ramo `update` **troca a senha de um admin que já existe**.
 * Rodar `npm run db:seed` apontado para produção sem a variável não cria um
 * segundo usuário — reescreve o do cliente com uma senha que está no
 * repositório público.
 *
 * A checagem é pelo endereço do banco, e não por `NODE_ENV`: esta é uma
 * ferramenta de linha de comando, e `NODE_ENV` quase nunca está definida na
 * hora em que alguém digita o comando errado.
 */
describe("o banco é o da minha máquina?", () => {
  it("reconhece o banco local do docker-compose", () => {
    expect(ehBancoLocal("postgresql://agency:agency@localhost:5432/agency")).toBe(true);
    expect(ehBancoLocal("postgresql://agency:agency@127.0.0.1:5432/agency")).toBe(true);
  });

  it("não confunde Supabase com local", () => {
    expect(
      ehBancoLocal("postgresql://postgres.abc:s@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"),
    ).toBe(false);
  });

  it("na dúvida, responde que não é local", () => {
    // Errar para "é local" libera a senha padrão contra um banco desconhecido.
    // Errar para "não é local" só exige uma variável a mais de quem está em casa.
    expect(ehBancoLocal(undefined)).toBe(false);
    expect(ehBancoLocal("")).toBe(false);
    expect(ehBancoLocal("isto não é uma URL")).toBe(false);
    // Nome de host que apenas *contém* localhost não é localhost.
    expect(ehBancoLocal("postgresql://u:s@localhost.evil.com:5432/db")).toBe(false);
  });
});

describe("impedimento para semear", () => {
  const LOCAL = "postgresql://agency:agency@localhost:5432/agency";
  const REMOTO = "postgresql://postgres.abc:s@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

  it("deixa passar na máquina de quem roda, sem exigir variável", () => {
    expect(impedimentoParaSemear(LOCAL, undefined, undefined)).toBeNull();
  });

  it("barra banco remoto sem senha explícita", () => {
    const erro = impedimentoParaSemear(REMOTO, undefined, undefined);
    expect(erro).toContain("SEED_ADMIN_PASSWORD");
  });

  it("barra banco remoto sem e-mail explícito", () => {
    // `admin@example.com` num banco real cria uma conta que ninguém reconhece
    // e ninguém remove.
    const erro = impedimentoParaSemear(REMOTO, undefined, "senha-forte-de-verdade");
    expect(erro).toContain("SEED_ADMIN_EMAIL");
  });

  it("deixa passar banco remoto quando as duas foram declaradas", () => {
    expect(
      impedimentoParaSemear(REMOTO, "dono@restauranteprato.com.br", "senha-forte-de-verdade"),
    ).toBeNull();
  });

  it("avisa que o seed sobrescreve o admin existente", () => {
    // A mensagem precisa dizer o que está em jogo, não só qual variável falta.
    expect(impedimentoParaSemear(REMOTO, undefined, undefined)).toMatch(/sobrescreve|troca|substitui/i);
  });
});
