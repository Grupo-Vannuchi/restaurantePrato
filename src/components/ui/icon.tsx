import {
  Camera,
  Sparkles,
  Info,
  BookOpen,
  FileText,
  Newspaper,
  ShieldCheck,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { Instagram } from "@/components/ui/brand-icons";

/**
 * Nomes guardados em `Information.icon` → componentes do lucide. Nome
 * desconhecido cai numa faísca neutra, então remover daqui nunca quebra
 * conteúdo já publicado.
 *
 * ⚠️ **Este `Record` é estático, logo NÃO é removível na compilação**: todo
 * ícone listado embarca em toda página pública, ainda que a página desenhe
 * zero. Por isso a lista é curta de propósito — cada entrada custa bytes a
 * todo visitante.
 *
 * Doze entradas saíram por serem do site da agência de onde este projeto foi
 * forkado: robô, fluxo de trabalho, impressora, métrica de campanha, paleta.
 * Um restaurante não publica novidade com esses ícones, e eles pesavam em toda
 * visita. Se o cliente pedir ícones de comida (talher, chapéu de chef,
 * calendário), acrescentar aqui é uma linha cada.
 */
const icons: Record<string, LucideIcon> = {
  Instagram,
  Camera,
  Info,
  BookOpen,
  FileText,
  Newspaper,
  ShieldCheck,
  Building2,
};

/** The icon names available to `Information.icon`, for admin pickers and validation. */
export const iconNames = Object.keys(icons);

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Component = icons[name] ?? Sparkles;
  return <Component className={className} aria-hidden />;
}
