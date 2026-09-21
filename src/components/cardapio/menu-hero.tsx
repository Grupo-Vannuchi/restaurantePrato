import { Container } from "@/components/ui/container";
import { Logo } from "@/components/layout/logo";

/**
 * A capa assina o cardápio — uma faixa estreita, e só.
 *
 * ⚠️ **Era uma abertura de altura cheia até 21/09/2026, e a troca é estrutural,
 * não de estilo.** O dono pediu a mesma estrutura do projeto irmão, cujo spec de
 * 14/09 decide isto em uma frase: *"a capa assina a página; não ocupa a primeira
 * dobra — comida vende, couro não."*
 *
 * O que mudou: a foto do churrasco, o horário e a ressalva saíram daqui e viraram
 * {@link MenuPhoto}, logo abaixo. Quem chega por um código na mesa continua vendo
 * a marca primeiro — mas em uma faixa, e o que ocupa a tela é a comida.
 *
 * ⚠️ **As cores são do PRATO, e isso não é liberdade poética.** A faixa do irmão
 * é couro com blocos laranja e a palavra "MENU" numa display gótica. Copiar os
 * hexes dele plantaria a paleta de outro cliente em `src/` — que é exatamente o
 * que `test/brand-hygiene.test.ts` varre e proíbe. Aqui a faixa é `brand`, os
 * blocos são `accent` e a assinatura é o nosso wordmark.
 *
 * ⚠️ **Os blocos de `accent` são fronteira, nunca superfície de texto.** É a
 * mesma regra dura do irmão sobre a curva laranja dele, e neste projeto ela tem
 * número: `accent` dá 1,92:1 com branco. Eles ficam ancorados na borda direita,
 * `aria-hidden`, sem nada escrito por cima — a assinatura é imagem e vive
 * centralizada, longe deles.
 *
 * Sem `h1`: o título da página é "Cardápio da semana", que nasce em
 * {@link MenuSection} com `level={1}`. A capa é identidade, não assunto.
 */
export function MenuHero() {
  return (
    <section className="relative isolate overflow-hidden bg-brand">
      {/*
        Dois blocos em diagonal na borda, como uma marca de canto. Decoração
        declarada: `aria-hidden` para o leitor de tela não anunciar geometria, e
        `pointer-events-none` para não roubar o clique da marca em tela estreita.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 flex"
      >
        <span className="block h-full w-8 bg-accent [clip-path:polygon(40%_0,100%_0,60%_100%,0_100%)] sm:w-12" />
        <span className="block h-full w-4 bg-accent [clip-path:polygon(40%_0,100%_0,60%_100%,0_100%)] sm:w-6" />
      </div>

      <Container className="relative flex items-center justify-center py-2 sm:py-2.5">
        {/*
          A variante clara tinge SÓ o nome — o cozinheiro fica nas cores dele, e
          numa faixa desta altura ele viraria borrão de qualquer forma. Sobre
          `brand`, o branco dá 4,98:1.
        */}
        {/* A altura da imagem vem do proprio `Logo` (h-10/h-11 para wordmark);
            aqui so o respiro da faixa, que fecha em ~56-60 px. */}
        <Logo variant="wordmark-claro" />
      </Container>
    </section>
  );
}
