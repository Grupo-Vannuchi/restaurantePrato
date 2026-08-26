import { getTranslations } from "next-intl/server";
import { LogOut, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/layout/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { logout } from "@/app/actions/auth";
import type { CurrentUser } from "@/lib/auth";
import type { Locale } from "@/i18n/routing";

export async function AdminShell({
  user,
  locale,
  children,
}: {
  user: CurrentUser;
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = await getTranslations("admin.nav");

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/*
        Mesmo link do layout público, pelo mesmo motivo: sem ele, quem navega
        por teclado atravessa nove elementos — a logo, os seis links do menu, o
        nome da pessoa e o botão de sair — antes de alcançar o conteúdo, em
        TODA página do painel. Critério WCAG 2.4.1, nível A.

        `sr-only` o mantém fora da tela sem escondê-lo do leitor; o
        `focus:not-sr-only` o traz de volta quando o Tab chega nele — um link
        que nem aparece ao ser focado não ajuda ninguém.
      */}
      <a
        href="#conteudo"
        className="sr-only rounded-md focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
      >
        {t("skipToContent")}
      </a>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card p-4 md:flex">
        <div className="px-2 py-3">
          <Logo className="text-xl" />
        </div>
        <div className="mt-4 flex-1">
          <AdminNav />
        </div>
        <div className="flex flex-col gap-1 border-t border-border pt-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-4" />
            {user.name}
          </Link>
          <form action={logout.bind(null, locale)}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" />
              {t("signOut")}
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <Logo className="text-lg" />
            <form action={logout.bind(null, locale)}>
              <button
                type="submit"
                aria-label={t("signOut")}
                className="text-muted-foreground"
              >
                <LogOut className="size-5" />
              </button>
            </form>
          </div>
          <AdminNav />
        </header>
        {/* `tabIndex={-1}` deixa o alvo receber foco por programa (o salto do
            link acima) sem entrar na ordem de tabulação. */}
        <main id="conteudo" tabIndex={-1} className="flex-1 p-6 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
