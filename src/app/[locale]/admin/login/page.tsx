import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/layout/logo";
import { resolveLocale } from "@/i18n/routing";

export const metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);

  // Already signed in → go straight to the dashboard.
  if (await getCurrentUser()) redirect({ href: "/admin", locale });

  const t = await getTranslations("admin.login");

  return (
    // O layout raiz manda ao cliente só o catálogo público; o formulário de
    // login precisa da namespace `admin`, que volta aqui.
    <NextIntlClientProvider messages={await getMessages()}>
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <Logo className="text-xl" />
            <h1 className="text-lg font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
