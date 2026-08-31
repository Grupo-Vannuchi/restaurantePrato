"use client";

import { usePathname } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";
import { Container } from "@/components/ui/container";
import { MapEmbed } from "@/components/layout/map-embed";

/**
 * O mapa do rodapé — em todas as páginas, menos na de contato.
 *
 * Lá ele aparece acima do formulário, junto do endereço, que é onde a pessoa
 * está procurando por ele. Dois mapas na mesma página, a algumas centenas de
 * pixels um do outro, não informam duas vezes: informam uma vez, ocupam o dobro
 * do espaço e pagam duas vezes o custo, porque cada embutido é um quadro do
 * Google com JavaScript próprio.
 *
 * Cliente porque a decisão depende da rota, e o rodapé é montado no layout, que
 * não conhece a página que está renderizando.
 *
 * ⚠️ O prefixo de idioma é removido antes de comparar. `usePathname` do
 * next-intl devolve o caminho sem ele, e a comparação exata funcionaria — até o
 * dia em que não funcionasse. O modo de falhar seria silencioso: a página de
 * contato voltaria a ter dois mapas, e nada acusaria. Uma linha compra a
 * garantia.
 */
const CONTATO = "/contato";

function semPrefixoDeIdioma(caminho: string): string {
  for (const idioma of locales) {
    if (caminho === `/${idioma}`) return "/";
    if (caminho.startsWith(`/${idioma}/`)) return caminho.slice(idioma.length + 1);
  }
  return caminho;
}

export function FooterMap({ src, title }: { src: string; title: string }) {
  const pathname = usePathname();
  if (semPrefixoDeIdioma(pathname) === CONTATO) return null;

  return (
    <div className="border-t border-border">
      <Container className="py-10">
        <MapEmbed src={src} title={title} />
      </Container>
    </div>
  );
}
