import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Section, SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";

/**
 * As três fotos da vitrine.
 *
 * ⚠️ **Aqui havia uma grade de cards com NOME de prato, vinda do banco, e ela
 * saiu em 25/09/2026 a pedido do cliente: "tire esses textos e coloque as
 * imagens".** Cada card trazia o nome do prato e as etiquetas de dia da semana
 * — "Arroz · Segunda, Terça, Quarta, Quinta, Sexta" —, que é a informação que
 * `/cardapio` já dá inteira, por dia, e com o cardápio do dia certo.
 *
 * Com os cards foi junto a consulta `getMenu()`: esta seção deixou de tocar o
 * banco. É a terceira consulta que a home perde, e pela terceira razão
 * diferente — as duas anteriores foram o menu de categorias em 31/08 e o do
 * cabeçalho em 24/09.
 *
 * ⚠️ `MenuItemCard` e `pratosDaVitrine` ficaram **sem nenhum consumidor**. Não
 * os apaguei junto: remover componente e biblioteca com os testes deles é
 * decisão maior do que a que foi pedida, e desfazer depois custa mais do que
 * apagar. Está reportado para o dono decidir.
 *
 * As fotos são do próprio restaurante, entregues em 25/09. O texto alternativo
 * descreve o que está no quadro sem batizar corte nem preparo que ninguém
 * confirmou — é foto de vitrine, não legenda de cardápio.
 */
const FOTOS = [
  {
    src: "/vitrine/prato-montado.webp",
    alt: "Prato montado com filés ao molho, folhas verdes, cenoura ralada e salada de tomate, sobre a mesa do salão",
  },
  {
    src: "/vitrine/carne-assada.webp",
    alt: "Peça de carne assada, dourada por fora, servida na travessa",
  },
  {
    src: "/vitrine/salada-de-frutas.webp",
    alt: "Taça de salada de frutas com mamão, melão, maçã e morango",
  },
];

export async function MenuPreview() {
  const t = await getTranslations("home.cardapio");
  const tc = await getTranslations("common");
  // `t.raw` porque é uma lista, e não uma frase — mesmo caminho de
  // `experiencia.contactCta.paragraphs` e dos slides do topo da home.
  const paragrafos = t.raw("paragraphs") as string[];

  return (
    <Section id="cardapio" className="bg-muted/30">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        {/* ⚠️ **O título vai em verde desde 25/09/2026, a pedido do cliente**, e
            a cor entra pela opção `titleTone` em vez de uma classe solta — ver
            o docblock dela em `ui/section.tsx`. Sobre o fundo desta seção
            (`bg-muted/30`) o verde mede 4,84:1, acima do mínimo de 4,5. */}
        <SectionHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          titleTone="brand"
          align="left"
        />
        <Link
          href="/cardapio"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {tc("viewAllMenu")}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* ⚠️ **Quatro parágrafos, e não o `subtitle` do cabeçalho.** A copy nova
          do cliente tem quatro blocos; enfiá-los no `subtitle` daria um `<p>`
          único de doze linhas, e pôr o cabeçalho inteiro dentro da linha do
          botão empurraria o "Ver toda a gastronomia" para o fim de um bloco
          alto, longe do título que ele acompanha.

          Então a linha de cima guarda o que ela sempre teve — olho, título e
          botão — e o texto desce para uma coluna própria. `max-w-2xl` mantém a
          linha na faixa confortável de leitura: sem isso, num monitor largo,
          cada parágrafo atravessa a tela inteira. */}
      <Reveal className="mt-6 flex max-w-2xl flex-col gap-4 text-pretty text-base text-muted-foreground sm:text-lg">
        {paragrafos.map((paragrafo) => (
          <p key={paragrafo}>{paragrafo}</p>
        ))}
      </Reveal>
      {/* `sizes` conta ao navegador quanto da tela cada foto ocupa em cada
          largura — sem isso ele baixa a variante de tela cheia para uma coluna
          de um terço. A ordem no HTML é a da leitura: prato, carne, sobremesa. */}
      <ul role="list" className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FOTOS.map((foto, i) => (
          <Reveal as="li" key={foto.src} delay={(i % 3) * 90}>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-muted">
              <Image
                src={foto.src}
                alt={foto.alt}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                quality={50}
                className="object-cover"
              />
            </div>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
