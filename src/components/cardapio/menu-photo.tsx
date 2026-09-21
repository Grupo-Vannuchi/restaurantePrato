import Image from "next/image";
import { useTranslations } from "next-intl";

import { Container } from "@/components/ui/container";
import { openingHoursLabel } from "@/config/site";

/**
 * A comida ocupa a primeira dobra do cardápio.
 *
 * ⚠️ **Isto era a metade de baixo do {@link MenuHero} até 21/09/2026.** A
 * abertura do cardápio era uma faixa de altura cheia com foto, marca, horário e
 * ressalva. O dono pediu a estrutura do projeto irmão, cujo spec resume a
 * decisão: *"a capa assina a página; não ocupa a primeira dobra — comida vende,
 * couro não."* Então a marca virou uma faixa estreita acima, e o que sobra aqui
 * é a fotografia — que é o que faz alguém descer a página.
 *
 * O horário sai de `openingHoursLabel()`, e não de uma string. A regra está no
 * AGENTS.md: a linha sem os dias diz ao leitor que a casa abre todo dia, e o
 * Prato fecha no fim de semana. Some inteira quando não há horário configurado.
 */

/**
 * A foto de fundo desta dobra.
 *
 * O churrasco na brasa, das dez fotos autorais que entraram em 03/09/2026. Para
 * trocar: solte o WebP em `public/hero` e aponte aqui — o componente aceita a
 * foto por prop justamente para o teste poder exercitar o caso sem arquivo.
 */
const FOTO_DE_FUNDO = "/hero/churrasco-na-brasa.webp";

/*
 * Síncrono de propósito: ele não busca nada. Um componente assíncrono sem espera
 * é um que este setup de teste não consegue renderizar, e a abertura ficaria sem
 * cobertura por um `async` que não faz nada.
 */
export function MenuPhoto({ photo = FOTO_DE_FUNDO }: { photo?: string } = {}) {
  const t = useTranslations("cardapio");
  const horario = openingHoursLabel();

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      {photo ? (
        <Image
          src={photo}
          alt=""
          fill
          priority
          sizes="100vw"
          quality={50}
          className="object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_100%_at_80%_20%,var(--color-accent)_0%,transparent_55%),radial-gradient(90%_90%_at_20%_90%,var(--color-brand)_0%,transparent_60%)] opacity-30"
        />
      )}

      {/* Véu de leitura.

          ⚠️ **Os números vieram de medição, não de gosto.** Com a foto do
          churrasco, que é escura, o `via-background/85` original punha a linha
          do horário em 4,27:1 no desktop e 4,13:1 no celular — abaixo dos
          4,5:1 da WCAG AA nas DUAS larguras. Nada acusava: a página desenhava e
          o teste de paleta seguia verde, porque ele mede pares de token e não o
          pixel composto sobre uma fotografia.

          `via/78 to/70` mede 5,15:1 e 5,08:1. Foi escolhido por ser o mais
          fraco dos que passam com folga: reforçar mais apagaria a foto sem
          ganhar legibilidade que já existe. Ao mexer aqui, medir de novo —
          `e2e/o-texto-sobre-a-foto-continua-legivel.spec.ts` cobre esta
          página. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-foreground/88 via-foreground/78 to-foreground/70"
      />

      <Container className="relative flex flex-col items-center gap-3 py-16 text-center sm:py-24">
        {horario ? (
          <p className="text-sm font-medium uppercase tracking-widest text-background">
            {horario}
          </p>
        ) : null}
        {/* A ressalva mora aqui em cima porque é onde ela ainda é AVISO: dita
            depois da lista, viraria desculpa. Fica um degrau abaixo do horário
            em corpo e em opacidade — quem procura o cardápio passa direto, e
            quem estranhar um prato encontra a explicação já lida. */}
        <p className="text-xs tracking-wide text-background/70">
          {t("subjectToChange")}
        </p>
      </Container>
    </section>
  );
}
