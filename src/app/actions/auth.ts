"use server";

import bcrypt from "bcryptjs";
import { hasLocale } from "next-intl";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createSession, deleteSession } from "@/lib/session";
import { loginSchema } from "@/lib/validations/auth";
import { redirect } from "@/i18n/navigation";
import { defaultLocale, routing } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";

export type LoginState = { error: boolean };

function localeFrom(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return hasLocale(routing.locales, value) ? value : defaultLocale;
}

/**
 * Hash de mentira, comparado quando o e-mail não existe.
 *
 * Sem ele, um e-mail inexistente responde na hora e um existente demora o
 * tempo do bcrypt — diferença medível, e suficiente para descobrir quais
 * e-mails têm conta. O `error` genérico não adianta nada se o relógio conta a
 * verdade. Este hash não corresponde a senha alguma.
 */
const HASH_DE_MENTIRA =
  "$2b$12$QQIDI1W/GJwpMgIwUKkf5uVcnH5Q.L3eb7/b52LS6lN4zu3Lggr02";

/**
 * Authenticates an admin user (react `useActionState` signature). On success it
 * creates the session and redirects to the dashboard; on failure it returns a
 * generic error (no user enumeration).
 *
 * ⚠️ O freio por IP vem **antes** da checagem de credencial, e a ordem é o
 * ponto: se viesse depois, bastaria acertar a senha dentro da janela para o
 * ataque de força bruta continuar valendo. Passado o limite, nem a senha certa
 * entra.
 *
 * O `/admin/login` é público — mesmo domínio do site, alcançável por qualquer
 * um. O formulário de contato tinha freio desde sempre; o login, que protege o
 * painel inteiro, não tinha.
 *
 * 5 tentativas a cada 5 minutos por IP: sobra para quem erra a senha duas ou
 * três vezes, e reduz a força bruta a algo inútil. O limitador **falha aberto**
 * (ver `lib/rate-limit`): se o Upstash cair, o login continua funcionando em
 * vez de trancar o dono do restaurante para fora do próprio painel.
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const locale = localeFrom(formData);

  const freio = await rateLimit("admin-login", await clientIp(), {
    limit: 5,
    windowSeconds: 300,
  });
  if (!freio.ok) return { error: true };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: true };

  const user = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
  });

  const valid = await bcrypt.compare(
    parsed.data.password,
    user?.passwordHash ?? HASH_DE_MENTIRA,
  );
  if (!user || !valid) return { error: true };

  await createSession({ userId: user.id, role: user.role });
  redirect({ href: "/admin", locale });
  throw new Error("unreachable: redirect halts execution");
}

/** Clears the session and returns to the login screen. */
export async function logout(locale: Locale): Promise<void> {
  await deleteSession();
  redirect({ href: "/admin/login", locale });
}
