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
    <section id={id} className="scroll-mt-24 pb-12 pt-12 sm:pb-16 sm:pt-16">
      <Container className="max-w-3xl">
        {/* ⚠️ **Cartão desde 01/10/2026, a pedido do dono: "a mesma estrutura
            do fogão de ouro, mas com as cores e as informações do Prato".** Lá
            o cabeçalho da seção é um cartão arredondado e escuro sobre o fundo
            da página; aqui o texto flutuava solto sobre o verde.

            ⚠️ **A cor é a do Prato, não a do irmão.** Lá o cartão é marrom,
            tirado da paleta de couro daquele restaurante. Aqui ele é o verde
            da marca — copiar o marrom de lá traria a marca do outro cliente
            junto com o leiaute. (A primeira versão usou o near-black; o dono
            pediu verde no mesmo dia.)

            ⚠️ **Nada aqui dentro tem opacidade, e isso é medida, não estilo.**
            Branco sobre `brand` dá 4,80:1 — folga de três décimos sobre o
            mínimo de 4,5. `text-background/85` já cairia abaixo. A hierarquia
            sai do TAMANHO (5xl / 2xl / sm em caixa alta), que é a mesma lição
            que o `Fact` de `/reservas` aprendeu reprovando em 4,25:1.

            ⚠️ Também não entra `text-muted-foreground`: aquele tom foi medido
            contra o fundo CLARO da página e some sobre o cartão. A varredura
            de contraste é quem assina. */}
        <div
          className={`flex flex-col gap-4 mb-12 rounded-2xl bg-brand px-6 py-8 sm:mb-16 sm:px-10 sm:py-10 ${
            centrado ? "items-center text-center" : "items-start"
          }`}
        >
          {/* ⚠️ **`break-words` desde 02/10/2026, e o defeito é meu, de um dia
              antes.** Ao virar cartão em 01/10 o título subiu de `text-3xl`
              para `text-4xl`. Medido a 200% de texto numa tela de 320:
              "Ilha de massas — R$ 41,90" alcança 367 px e empurra a página
              para o lado (WCAG 1.4.10).

              `text-balance` não resolve: ele reparte as linhas, não quebra
              palavra. É a mesma lição do `page-header`, onde "Experiência"
              sozinha media mais que a tela. `break-words` só age quando não
              cabe; em corpo normal não muda um pixel.

              ⚠️ **E `break-words` SOZINHO não bastou** — medi. O título é
              filho direto de um flex em coluna, então ele se dimensiona pelo
              próprio conteúdo e nunca chega a ser apertado: "Sobremesas",
              uma palavra só, alcançava 506 px numa tela de 412. `w-full`
              prende a largura à do cartão, e aí a quebra tem contra o que
              agir. É o mesmo par `min-w-0`/`break-words` que o rodapé usa
              para o e-mail — um sem o outro não resolve. */}
          <Titulo className="w-full text-balance break-words font-serif text-4xl font-bold tracking-tight text-background sm:text-5xl">
            {title}
          </Titulo>
          {subtitle ? (
            <p
              className={`text-pretty text-xl text-background sm:text-2xl ${centrado ? "max-w-xl" : ""}`}
            >
              {subtitle}
            </p>
          ) : null}
          {note ? (
            <p className="text-sm font-medium uppercase tracking-widest text-background">
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
