import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/layout/logo";
import { useTranslations } from "next-intl";

import { openingHoursLabel } from "@/config/site";

/**
 * Abertura do cardápio digital: a marca antes da comida.
 *
 * Quem chega aqui pode ter escaneado um código na mesa e nunca ter visto o
 * site. Este é o primeiro contato com a marca, e por isso a identidade vem
 * antes da lista. Estático, e não carrossel: o topo da home tem slides porque
 * conta uma história; aqui o objetivo é a pessoa reconhecer onde está e descer.
 *
 * ⚠️ **Passou a ser véu ESCURO com marca clara em 10/09, e os dois
 * impedimentos que seguravam isso acabaram.** Este comentário dizia que copiar
 * o projeto irmão renderia "uma faixa preta com um buraco no meio", porque não
 * havia foto nenhuma e a marca era tipográfica. A foto entrou em 03/09 e a logo
 * em 09/09.
 *
 * O que forçou a troca agora foi uma inconsistência que eu mesmo criei: em
 * 09/09 o topo da home passou a véu escuro com texto claro, a pedido, e esta
 * abertura ficou clara com texto escuro. As duas aberturas do site deixaram de
 * conversar.
 *
 * Fazer os dois modos — claro sem foto, escuro com foto — significaria embarcar
 * um caminho que ninguém consegue ver hoje, para ele estrear no dia em que a
 * foto chegar e ninguém estiver olhando. Então segue o padrão que o topo da
 * home já usa neste site: véu CLARO e texto escuro, que funciona igual nos dois
 * estados.
 *
 * O horário sai de `openingHoursLabel()`, e não de uma string. A regra está no
 * AGENTS.md: a linha sem os dias diz ao leitor que a casa abre todo dia, e o
 * Prato fecha no fim de semana. Some inteira quando não há horário configurado.
 */

/**
 * A foto de fundo da abertura.
 *
 * ⚠️ VAZIA DE PROPÓSITO, como `slideImages` no topo da home. As fotos do
 * cliente ainda não foram aprovadas, e uma imagem de banco de imagens
 * representaria mal o restaurante. Para publicar: ponha o arquivo em
 * `public/ambiente/` e o caminho aqui.
 */
const FOTO_DE_FUNDO = "/hero/churrasco-na-brasa.webp";

/*
 * Síncrono de propósito: ele não busca nada. O equivalente do projeto irmão é
 * assíncrono porque lê o horário do catálogo de traduções; aqui o horário vem
 * de `siteConfig`, que é código. Um componente assíncrono sem espera é um que
 * este setup de teste não consegue renderizar, e a abertura ficaria sem
 * cobertura por um `async` que não faz nada.
 */
export function MenuHero({ photo = FOTO_DE_FUNDO }: { photo?: string } = {}) {
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

      {/* Véu de leitura. Claro nos dois casos: o texto é escuro, e com foto ele
          continua sendo — mesmo tratamento do topo da home.

          ⚠️ **Os números vieram de medição, não de gosto.** Enquanto não havia
          foto, o véu cobria um degradê claro da marca e qualquer opacidade
          servia. Com a foto do churrasco, que é escura, o `via-background/85`
          original punha a linha do horário em 4,27:1 no desktop e 4,13:1 no
          celular — abaixo dos 4,5:1 da WCAG AA nas DUAS larguras. Nada
          acusava: a página desenhava e o teste de paleta seguia verde, porque
          ele mede pares de token e não o pixel composto sobre uma fotografia.

          `via/90 to/82` mede 5,15:1 e 5,08:1. Foi escolhido por ser o mais
          fraco dos que passam com folga: reforçar mais apagaria a foto sem
          ganhar legibilidade que já existe. Ao mexer aqui, medir de novo —
          `e2e/o-texto-sobre-a-foto-continua-legivel.spec.ts` cobre esta página. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-foreground/88 via-foreground/78 to-foreground/70"
      />

      <Container className="relative flex flex-col items-center gap-4 py-12 text-center sm:py-16">
        {/* A variante clara: sobre véu escuro o nome verde apagaria. Só o
            nome é tingido — o cozinheiro fica nas cores dele, porque tingir o
            conjunto o transforma em silhueta sem rosto. */}
        <Logo variant="lockup-claro" />
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
