import { siteConfig } from "@/config/site";

/**
 * Injeta a paleta da marca como variáveis CSS em `:root`, no `<head>`, para os
 * valores existirem antes da primeira pintura.
 *
 * ⚠️ **Uma cara só.** O site tinha três estados de aparência — claro, escuro e
 * "o que o sistema estiver usando" — com um botão para trocar. O cliente
 * entregou uma paleta única (off white e quase-preto), e manter os três
 * significaria inventar as variações escuras que ele não forneceu.
 *
 * `color-scheme: light` não é decoração: é o que faz o navegador pintar campos
 * de formulário, barra de rolagem e barra de endereço no tom certo. Sem ele,
 * quem está com o sistema no escuro veria um site claro com controles escuros.
 */
export function ThemeStyle() {
  const { brand, brandForeground, accent, background, foreground } =
    siteConfig.theme;
  const css =
    `:root{color-scheme:light;` +
    `--brand:${brand};` +
    `--brand-foreground:${brandForeground};` +
    `--accent:${accent};` +
    `--background:${background};` +
    `--foreground:${foreground}}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
