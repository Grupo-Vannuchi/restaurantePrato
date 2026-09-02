"use client";

import { Scale, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Os preços do cardápio, lado a lado.
 *
 * Ficam juntos e logo abaixo do título porque é a primeira pergunta de quem
 * senta na mesa, e separados porque são duas contas diferentes: o buffet é
 * cobrado pelo peso do prato montado, a massa tem valor fechado. Misturar os
 * dois números num bloco só é exatamente o mal-entendido que este componente
 * existe para evitar.
 *
 * Nenhum prato exibe preço em lugar nenhum do site: o valor é sempre da seção,
 * nunca do item.
 *
 * ⚠️ **Cada cartão aparece só se o SEU preço existir, e o bloco inteiro some
 * quando nenhum existe.** Os dois valores ainda não vieram do cliente, e um
 * rótulo "Buffet por quilo" seguido de nada é pior que aviso nenhum: quem lê na
 * mesa entende que o preço deveria estar ali e conclui que a página quebrou. É o
 * mesmo desenho do telefone e do WhatsApp neste projeto.
 *
 * Os preços chegam por parâmetro em vez de o componente ler a configuração. Não
 * é preferência: lendo a configuração, o teste só conseguiria exercitar o estado
 * de hoje (sem preço), e o caminho com preço ficaria sem cobertura até o dia em
 * que ele passasse a existir — que é justamente o dia em que ninguém vai estar
 * olhando.
 */
export function PriceCallout({
  buffet,
  massa,
}: {
  /** Já formatado, com o sufixo por quilo. `null` quando não configurado. */
  buffet: string | null;
  /** Já formatado. `null` quando não configurado. */
  massa: string | null;
}) {
  const t = useTranslations("cardapio");

  /*
   * Montada com `if`, e não com `preco && {...}` seguido de filtro: o `&&`
   * deixa a string VAZIA no tipo (`"" | {...}`), e nenhum filtro de `null`
   * estreita isso. O TypeScript reclamaria de cada campo lido depois.
   */
  const cartoes: {
    icone: typeof Scale;
    rotulo: string;
    preco: string;
    nota: string;
  }[] = [];

  if (buffet) {
    cartoes.push({
      icone: Scale,
      rotulo: t("buffetLabel"),
      preco: buffet,
      nota: t("buffetNote"),
    });
  }

  if (massa) {
    cartoes.push({
      icone: UtensilsCrossed,
      rotulo: t("pastaLabel"),
      preco: massa,
      nota: t("pastaNote"),
    });
  }

  if (cartoes.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cartoes.map((cartao) => (
        <div
          key={cartao.rotulo}
          className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
        >
          <cartao.icone className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              {cartao.rotulo}
            </p>
            <p className="mt-0.5 font-serif text-xl font-bold">{cartao.preco}</p>
            <p className="mt-1 text-pretty text-sm text-muted-foreground">
              {cartao.nota}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
