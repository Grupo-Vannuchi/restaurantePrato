import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Força bruta no login do painel.
 *
 * O `/admin/login` é público — está no mesmo domínio do site, alcançável por
 * qualquer um. O formulário de contato tem freio por IP desde sempre; o login,
 * que protege o painel inteiro, não tinha. Sem ele, um atacante tenta senhas
 * na velocidade que a rede aguentar, e a única defesa é o comprimento da senha.
 *
 * O teste prova a ordem certa: passado o limite, **nem a senha correta entra**.
 * Se a verificação de credencial viesse antes do freio, o ataque continuaria
 * possível — bastaria acertar dentro da janela.
 */

const SENHA = "senha-correta-123";
const hash = bcrypt.hashSync(SENHA, 4); // custo baixo: é teste, não produção

const findUnique = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { adminUser: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

vi.mock("@/lib/session", () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
}));

// `redirect` do next-intl interrompe a execução lançando; imitamos isso com um
// erro reconhecível para saber que o login foi adiante e teve sucesso.
class RedirecionouError extends Error {}
vi.mock("@/i18n/navigation", () => ({
  redirect: () => {
    throw new RedirecionouError("redirecionou");
  },
}));

import { login } from "@/app/actions/auth";

function tentativa(senha: string) {
  const fd = new FormData();
  fd.set("email", "admin@prato.test");
  fd.set("password", senha);
  fd.set("locale", "pt");
  return login({ error: false }, fd);
}

/** Executa uma tentativa e diz se ela teria entrado no painel. */
async function entrou(senha: string): Promise<boolean> {
  try {
    await tentativa(senha);
    return false; // devolveu erro em vez de redirecionar
  } catch (e) {
    return e instanceof RedirecionouError;
  }
}

beforeEach(() => {
  findUnique.mockReset();
  findUnique.mockResolvedValue({
    id: "user-1",
    email: "admin@prato.test",
    passwordHash: hash,
    role: "ADMIN",
  });
});

describe("login do painel", () => {
  it("deixa entrar com a senha certa", async () => {
    expect(await entrou(SENHA)).toBe(true);
  });

  it("recusa a senha errada", async () => {
    expect(await entrou("senha-errada")).toBe(false);
  });

  it("trava o IP depois de tentativas seguidas — inclusive para a senha certa", async () => {
    for (let i = 0; i < 5; i++) {
      await entrou(`tentativa-numero-${i}`);
    }
    expect(await entrou(SENHA)).toBe(false);
  });
});
