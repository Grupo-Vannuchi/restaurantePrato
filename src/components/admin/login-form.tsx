"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = { error: false };

export function LoginForm() {
  const t = useTranslations("admin.login");
  const locale = useLocale();
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="locale" value={locale} />

      <div>
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          name="email"
          aria-invalid={state.error || undefined}
          aria-describedby={state.error ? "erro-login" : undefined}
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          name="password"
          aria-invalid={state.error || undefined}
          aria-describedby={state.error ? "erro-login" : undefined}
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      {state.error ? (
        <p id="erro-login" role="alert" className="text-sm text-danger">
          {t("error")}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
