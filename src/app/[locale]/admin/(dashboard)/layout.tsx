import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { resolveLocale } from "@/i18n/routing";

export const metadata = { robots: { index: false, follow: false } };

// Admin is always rendered per request (session + live data); never prerender.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);

  // Redirects to /admin/login when not authenticated.
  const user = await requireAdmin(locale);

  // O layout raiz manda ao cliente só o catálogo público — a namespace `admin`
  // são 12 KB que o visitante do site não usa. Aqui ela volta, para o painel
  // ter os textos dele.
  return (
    <NextIntlClientProvider messages={await getMessages()}>
      <AdminShell user={user} locale={locale}>
        {children}
      </AdminShell>
    </NextIntlClientProvider>
  );
}
