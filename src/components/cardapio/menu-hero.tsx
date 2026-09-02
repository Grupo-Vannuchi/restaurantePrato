import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/layout/logo";
import { openingHoursLabel } from "@/config/site";

/**
 * Abertura do cardápio digital: a marca antes da comida.
 *
 * Quem chega aqui pode ter escaneado um código na mesa e nunca ter visto o
 * site. Este é o primeiro contato com a marca, e por isso a identidade vem
 * antes da lista. Estático, e não carrossel: o topo da home tem slides porque
 * conta uma história; aqui o objetivo é a pessoa reconhecer onde está e descer.
 *
 * ⚠️ **Um caminho visual só, com foto ou sem.** O equivalente do projeto irmão
 * põe uma foto do buffet ao fundo com véu ESCURO e a marca clara por cima.
 * Copiar aqui renderia uma faixa preta com um buraco no meio: não há foto
 * nenhuma, e a marca ainda é tipográfica (ver `public/brand/README.md`).
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
const FOTO_DE_FUNDO = "";

/*
 * Síncrono de propósito: ele não busca nada. O equivalente do projeto irmão é
 * assíncrono porque lê o horário do catálogo de traduções; aqui o horário vem
 * de `siteConfig`, que é código. Um componente assíncrono sem espera é um que
 * este setup de teste não consegue renderizar, e a abertura ficaria sem
 * cobertura por um `async` que não faz nada.
 */
export function MenuHero() {
  const horario = openingHoursLabel();

  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      {FOTO_DE_FUNDO ? (
        <Image
          src={FOTO_DE_FUNDO}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_100%_at_80%_20%,var(--color-accent)_0%,transparent_55%),radial-gradient(90%_90%_at_20%_90%,var(--color-brand)_0%,transparent_60%)] opacity-30"
        />
      )}

      {/* Véu de leitura. Claro nos dois casos: o texto é escuro, e com foto ele
          continua sendo — mesmo tratamento do topo da home. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-background via-background/85 to-background/70"
      />

      <Container className="relative flex flex-col items-center gap-4 py-12 text-center sm:py-16">
        {/* `lockup` é a variante com espaço, e aqui há. Enquanto a marca for
            tipográfica isto é o nome na serifada; quando o arquivo chegar, vira
            imagem sem tocar nesta página. */}
        <Logo variant="lockup" className="text-3xl sm:text-4xl" />
        {horario ? (
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            {horario}
          </p>
        ) : null}
      </Container>
    </section>
  );
}
