import { getTranslations, setRequestLocale } from "next-intl/server";
import { AttributionCapture } from "@/components/attribution-capture";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsappButton } from "@/components/layout/whatsapp-button";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/json-ld";
import { getInformations, getMenuCategoryLinks } from "@/lib/queries";
import { resolveLocale } from "@/i18n/routing";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("nav");

  // The gallery is no longer a top-level menu item, so the header only needs
  // the gastronomy children — one query fewer on every marketing page.
  const [categories, informations] = await Promise.all([
    getMenuCategoryLinks(locale),
    getInformations(locale),
  ]);
  const categoryLinks = categories.map((c) => ({ slug: c.slug, title: c.name }));
  const informationLinks = informations.map((i) => ({
    slug: i.slug,
    title: i.title,
    icon: i.icon,
  }));

  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      {/*
        Primeiro elemento focável da página, e de propósito: sem ele, quem
        navega por teclado atravessa o cabeçalho inteiro — logo, seis links de
        menu e dois submenus — antes de alcançar o texto, em toda página.
        Critério WCAG 2.4.1, nível A.

        Fica invisível até receber foco. `sr-only` o esconde de quem enxerga
        sem escondê-lo do leitor de tela; `focus:not-sr-only` o traz de volta à
        tela no instante em que o Tab chega nele — um link que nem aparece ao
        ser focado não ajuda ninguém.
      */}
      <a
        href="#conteudo"
        className="sr-only rounded-md focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg"
      >
        {t("skipToContent")}
      </a>
      <Header serviceLinks={categoryLinks} informationLinks={informationLinks} />
      {/* `tabIndex={-1}` deixa o alvo receber foco por programa (o salto do
          link acima) sem entrar na ordem de tabulação. */}
      <main id="conteudo" tabIndex={-1} className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsappButton />
      {/* Sem Vercel Analytics / Speed Insights: era infraestrutura da agência,
          não do restaurante. Se um dia entrar, o parágrafo correspondente da
          Política de Privacidade (`src/content/legal.ts`) precisa voltar junto —
          declarar a coleta é obrigação de LGPD, não cortesia. */}
      <AttributionCapture />
    </>
  );
}
