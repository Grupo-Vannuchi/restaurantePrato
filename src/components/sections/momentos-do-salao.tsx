import { getTranslations } from "next-intl/server";
import { Sofa, Sunrise, Users, type LucideIcon } from "lucide-react";

/**
 * Uma linha de informação: ícone, rótulo e valor.
 *
 * Morava dentro de `/reservas` e subiu para cá quando os três momentos do salão
 * passaram a aparecer em duas páginas. Continua exportado porque `/reservas`
 * usa o mesmo desenho para o horário e o endereço, que não são momentos.
 */
export function Fact({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  /**
   * Uma linha menor sob o valor, para o que COMPLEMENTA o dado sem ser ele.
   *
   * ⚠️ **A hierarquia vem do TAMANHO, nunca de opacidade.** A primeira versao
   * usava `text-muted-foreground/80` e a varredura de contraste reprovou em
   * 4,25:1 contra o minimo de 4,5 — em tres larguras de tela. Opacidade sobre
   * uma cor que ja e a mais clara da paleta nao tem folga para gastar; `text-sm`
   * diferencia a linha sem custar legibilidade.
   *
   * Existe desde 18/09/2026 para o ponto de referencia do endereco: "perto da
   * Praca Maua" nao e o endereco, e juntar os dois numa string so faria o
   * endereco parecer mais longo do que e — inclusive na linha que vira link
   * para o mapa.
   *
   * Opcional: sem nota, nada e desenhado, em vez de sobrar um paragrafo vazio.
   */
  note?: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Icon className="size-5" />
      </span>
      {/* `min-w-0` autoriza a coluna a encolher abaixo do conteúdo: sem isso
          uma palavra longa define a largura mínima da linha e empurra a página
          para o lado com o texto ampliado. */}
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-pretty text-muted-foreground">{value}</p>
        {note ? (
          <p className="text-pretty text-sm text-muted-foreground">{note}</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Como está o salão ao longo do almoço: cedo, no pico e depois do pico.
 *
 * ⚠️ **Uma fonte, dois lugares — e é diferente do projeto irmão de propósito.**
 * Lá esta informação existe duas vezes, em `experiencia.timing` e em
 * `reservas.bestTime`, com textos parecidos e separados. Duas cópias da mesma
 * informação divergem: no dia em que o cliente mudar o horário de pico, uma
 * delas fica para trás, e ninguém sabe qual das duas o visitante leu.
 *
 * Aqui as seis frases vivem uma vez, no namespace `salao`, e as duas páginas
 * renderizam a MESMA lista. `/reservas` a usa dentro da grade de informação
 * prática, ao lado do horário e do endereço; `/experiencia` a usa como seção
 * própria, com título.
 *
 * ⚠️ **As frases saíram de `reservas` para `salao` quando isto foi extraído.**
 * Um componente compartilhado lendo a namespace de uma das páginas que o usam é
 * a próxima pessoa se perguntando por que a Experiência importa copy de
 * Horários. Só `/reservas` referenciava as chaves, então a mudança foi barata.
 *
 * Devolve um fragmento com três linhas, sem grade própria: quem chama decide o
 * arranjo. É o que permite as duas páginas usarem o mesmo conteúdo em layouts
 * diferentes sem uma prop de variante.
 */
export async function MomentosDoSalao() {
  const t = await getTranslations("salao");

  const momentos: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Sunrise, label: t("earlyLabel"), value: t("earlyValue") },
    { icon: Users, label: t("peakLabel"), value: t("peakValue") },
    { icon: Sofa, label: t("lateLabel"), value: t("lateValue") },
  ];

  return (
    <>
      {momentos.map((m) => (
        <Fact key={m.label} icon={m.icon} label={m.label} value={m.value} />
      ))}
    </>
  );
}
