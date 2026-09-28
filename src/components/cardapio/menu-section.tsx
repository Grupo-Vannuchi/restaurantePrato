import Image from "next/image";

import { Container } from "@/components/ui/container";

/**
 * Uma seção do cardápio digital, sobre o fundo verde.
 *
 * Existe em vez de `Section` + `SectionHeader` por uma razão só, e ela é de
 * cor: aqui o título e o subtítulo caem SOLTOS sobre o fundo, fora de qualquer
 * `bg-card`, e os tokens do tema (`text-foreground`, `text-muted-foreground`)
 * foram medidos contra o creme do site. Sobre verde escuro eles viram texto
 * escuro sobre fundo escuro. As duas cores daqui vêm de `menu-backdrop.tsx`,
 * onde estão medidas contra o ponto mais claro do degradê.
 *
 * ⚠️ **Sem `border-t` e sem `bg-muted/30`**, que é como as seções desta página
 * se separavam antes. Sobre o degradê, uma faixa de fundo translúcido desenha
 * exatamente a "forma reconhecível" que o fundo foi feito para não ter — e a
 * borda vira um risco claro no meio do verde. Quem separa as seções agora é o
 * espaço e a mudança de cor do título; quem dá superfície ao conteúdo são os
 * cartões (`bg-card`) que já existem dentro de cada lista.
 *
 * A coluna segue `max-w-3xl`: cardápio se lê de cima a baixo, não se varre em
 * grade, e a medida mantém a linha na faixa confortável mesmo num monitor
 * largo.
 */
export function MenuSection({
  id,
  title,
  subtitle,
  note,
  photo,
  align = "center",
  level = 2,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  /**
   * Linha curta abaixo do subtítulo, em versalete.
   *
   * ⚠️ **Existe para o horário, e ele chegou aqui em 28/09/2026 vindo de outro
   * lugar.** Até então o cardápio abria com uma faixa da marca e uma dobra de
   * foto, e o horário morava nela. As duas saíram a pedido do dono, que pediu a
   * estrutura do projeto irmão — lá o cardápio abre direto na seção do buffet e
   * o horário vai no cabeçalho dela.
   *
   * A leitura que sustenta: quem lê "Cardápio da semana" quer saber QUE dias
   * junto do letreiro que promete os cinco, e não trinta linhas abaixo.
   *
   * ⚠️ Nunca montar a frase aqui a partir de `opens`/`closes` — use
   * `openingHoursLabel()`. A regra e o motivo estão no AGENTS.md: a linha sem a
   * faixa de DIAS manda o visitante para a porta fechada no sábado.
   */
  note?: string;
  /**
   * Foto no topo da seção, entre o cabeçalho e o conteúdo.
   *
   * `object-contain` e não `cover`: estas fotos são de prato e de bebida, e
   * recortar para preencher come justamente a borda do prato. Quem decide o
   * enquadramento é quem fotografou.
   */
  photo?: { src: string; alt: string };
  /** `left` para as seções internas; o topo da página usa `center`. */
  align?: "center" | "left";
  /**
   * O nível do título. `2` por padrão; a PRIMEIRA seção da página passa `1`.
   *
   * ⚠️ **Existe porque o `h1` do cardápio morava no `PageHeader`, que saiu com
   * o redesenho de 18/09 — e `e2e/a-arvore-de-titulos-do-cardapio.spec.ts`
   * reprovou com "a página precisa de exatamente um h1", recebendo zero.**
   *
   * Pôr o `h1` de volta num cabeçalho separado seria repetir o título: o da
   * primeira seção JÁ é o título da página ("Cardápio da semana"). O nível
   * acompanha o papel em vez de duplicar o texto.
   */
  level?: 1 | 2;
  children: React.ReactNode;
}) {
  const centrado = align === "center";
  const Titulo = level === 1 ? "h1" : "h2";

  return (
    <section id={id} className="scroll-mt-24 pb-12 sm:pb-16">
      <Container className="max-w-3xl">
        <div
          className={`flex flex-col gap-3 pt-12 sm:pt-16 ${
            centrado ? "items-center text-center" : "items-start"
          }`}
        >
          <Titulo className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </Titulo>
          {subtitle ? (
            <p
              className={`text-pretty text-lg sm:text-xl text-muted-foreground ${centrado ? "max-w-xl" : ""}`}
            >
              {subtitle}
            </p>
          ) : null}
          {/* ⚠️ `muted-foreground`, e NÃO `brand` — o verde da marca não serve
              de texto sobre o fundo desta página. Está escrito em
              `menu-backdrop.tsx`, com a medida: 3,41:1 no pior tom do fundo,
              contra 4,74:1 do `muted-foreground`. Escrevi `text-brand` aqui na
              primeira versão e a varredura reprovou seis vezes, entre 4,19 e
              4,23 — o número real do pixel composto, mais generoso que o pior
              caso do docblock e ainda assim abaixo do mínimo de 4,5. */}
          {note ? (
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              {note}
            </p>
          ) : null}
        </div>

        {photo ? (
          <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-2xl">
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              quality={50}
              className="object-contain"
            />
          </div>
        ) : null}

        {children}
      </Container>
    </section>
  );
}
