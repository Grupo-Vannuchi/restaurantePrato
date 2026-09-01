"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/layout/logo";
import {
  InformationMenu,
  type InformationLink,
} from "@/components/layout/information-menu";
import { Icon } from "@/components/ui/icon";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

/**
 * Id do painel do celular — o botão o declara em `aria-controls`.
 *
 * Exportado porque é contrato, e `test/menu-do-celular.test.tsx` se ancora
 * nele: no jsdom não há CSS, então o `<nav>` do desktop e o do celular
 * coexistem com o mesmo nome. No navegador só um dos dois chega à árvore de
 * acessibilidade, porque o outro está em `display: none`.
 */
export const PAINEL_DO_CELULAR = "menu-do-celular";

export function Header({
  informationLinks = [],
}: {
  informationLinks?: InformationLink[];
}) {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const alternadorRef = useRef<HTMLButtonElement | null>(null);

  /*
   * Escape fecha o menu do celular e devolve o foco ao botão.
   *
   * Não é armadilha de foco, e não deve ser: o painel é uma revelação
   * (disclosure), não um diálogo modal — ele é irmão seguinte do botão no DOM,
   * então o Tab entra nele naturalmente. O que faltava era só a saída pelo
   * teclado, e devolver o foco a quem abriu: fechar sem devolver deixa a pessoa
   * no `<body>`, sem pista de onde estava.
   */
  useEffect(() => {
    if (!open) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setOpen(false);
      alternadorRef.current?.focus();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [open]);

  /*
   * ⚠️ Não existe mais menu suspenso de categorias, e isso é decisão, não
   * esquecimento. Ele listava as categorias do cardápio, cada uma levando a uma
   * âncora dentro de `/gastronomia`. Em `/cardapio` as categorias vivem dentro
   * das abas de dia — há cinco cópias de "Guarnições", uma por dia —, então não
   * existe âncora única para onde apontar. Um menu suspenso cujos itens levam
   * todos ao mesmo lugar é pior que nenhum.
   *
   * Saiu junto a canalização que o alimentava: a consulta de categorias, a prop
   * do cabeçalho e o submenu do celular. Mecanismo que nunca pode ser ativado é
   * peso morto, e este projeto tem guarda contra isso.
   */

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Logo />

        {/* O rótulo vem do catálogo: era a string crua "Primary", em inglês,
            num site que é PT-only por decisão de projeto. */}
        <nav
          className="hidden items-center gap-8 md:flex"
          aria-label={t("primaryNav")}
        >
          {siteConfig.nav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/reservas" className={buttonVariants({ size: "sm" })}>
            {tc("talkToUs")}
          </Link>
          <InformationMenu links={informationLinks} />
        </div>

        <button
          type="button"
          ref={alternadorRef}
          className="inline-flex size-10 items-center justify-center rounded-md md:hidden"
          aria-expanded={open}
          aria-controls={PAINEL_DO_CELULAR}
          aria-label={open ? t("closeMenu") : t("openMenu")}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </Container>

      {open ? (
        /* `<nav>`, e não `<div>`: no desktop existe um marco de navegação e no
           celular eram `<Link>` soltos. Quem navega por marcos perdia a
           navegação inteira justamente no aparelho por onde a maioria chega. */
        <nav
          id={PAINEL_DO_CELULAR}
          aria-label={t("primaryNav")}
          className="border-t border-border bg-background md:hidden"
        >
          <Container className="flex flex-col gap-1 py-4">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2.5 text-base font-medium hover:bg-muted"
              >
                {t(item.key)}
              </Link>
            ))}
            {informationLinks.length > 0 ? (
              <div className="mt-2 border-t border-border pt-2">
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("novidades")}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {informationLinks.map((link) => (
                    <li key={link.slug}>
                      <Link
                        href={`/novidades/${link.slug}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Icon name={link.icon} className="size-4 shrink-0" />
                        <span className="truncate">{link.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-3 flex items-center justify-end border-t border-border pt-3">
              <Link
                href="/reservas"
                onClick={() => setOpen(false)}
                className={buttonVariants({ size: "sm" })}
              >
                {tc("talkToUs")}
              </Link>
            </div>
          </Container>
        </nav>
      ) : null}
    </header>
  );
}
