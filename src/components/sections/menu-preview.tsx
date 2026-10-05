import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Section, SectionHeader } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";
import { buttonVariants } from "@/components/ui/button";

/*
 * ⚠️ **Quatro fotos, na ordem que o dono ditou: prato de comida, massa,
 * carne, sobremesa.**
 *
 * A quarta já existiu em 01/10 e era a salada de frutas, que ele identificou
 * no mesmo dia como sobremesa do OUTRO restaurante. O arquivo foi apagado, e
 * não só desreferenciado: `public/` é servido pela URL, referenciado ou não.
 * O cartão ficou de fora por um dia, até as fotos de sobremesa do Prato
 * chegarem em 02/10 — a que entrou é dele.
 *
 * ⚠️ Esta é 16:9, recortada da MESMA origem que a miniatura quadrada de
 * `public/sobremesas`. Dois recortes do mesmo arquivo, e não um reaproveitado:
 * a miniatura da lista do cardápio é `size-24` e o cartão daqui é uma faixa.
 *
 *
 * A grade vai a QUATRO colunas junto. Com três colunas a quarta foto ficaria
 * sozinha numa segunda fila, e card solto numa linha vazia lê como erro de
 * carregamento. O `sizes` acompanha: ele descreve a caixa, e prometer um terço
 * da tela quando ela ocupa um quarto faz o navegador baixar a variante maior.
 *
 * ⚠️ **A foto de carne trocou, e a antiga era repetida.** `carne-assada` e a
 * `pernil-assado` da galeria são a MESMA fotografia (distância 1 na impressão
 * digital) — a peça assada aparecia duas vezes no site sem ninguém ter
 * decidido isso. O arquivo foi apagado daqui; a foto continua publicada na
 * galeria, então nada do cliente se perdeu.
 *
 * ⚠️ **A carne de hoje também aparece no topo da home e na galeria**, e isso é
 * escolha por falta de opção, não por gosto: nenhuma das fotos entregues até
 * 01/10 mostra um corte de carne que se leia num card pequeno, fora esta. Se
 * chegar uma inédita, troque — é uma linha.
 *
 * O texto alternativo descreve o que está no quadro sem batizar corte nem
 * preparo que ninguém confirmou — é foto de vitrine, não legenda de cardápio.
 */
const FOTOS = [
  {
    src: "/vitrine/prato-montado.webp",
    alt: "Prato montado com filés ao molho, folhas verdes, cenoura ralada e salada de tomate, sobre a mesa do salão",
  },
  {
    src: "/vitrine/fettuccine-ao-pesto.webp",
    alt: "Fettuccine ao pesto, com manjericão e queijo ralado",
  },
  {
    /* ⚠️ **Foto de carne PRÓPRIA desde 05/10/2026 — antes não havia.** Este
       cartão passou por três fotos sem acertar: o churrasco do topo (que
       saiu por virar exclusivo da home), a peça assada, que o dono pediu
       para trocar DUAS vezes, e a peça assada de novo, porque não existia
       outra carne no projeto inteiro. As cinco fotos da churrasqueira que
       chegaram hoje fecham isso. */
    src: "/vitrine/carne-na-brasa.webp",
    alt: "Peça de carne no espeto, dourada na brasa, com a capa de gordura",
  },
  {
    /* ⚠️ Terceira foto neste cartão em 02/10: petit gateau, torta de limão e
       enfim o brownie, escolhido pelo dono. As trocas foram de gosto dele, e
       o critério que eu vinha usando — contraste de tom com os três cartões
       ao lado — perdeu para isso, que é como tem de ser. Fica registrado só
       para ninguém "corrigir" de volta citando o raciocínio do tom. */
    src: "/vitrine/brownie-com-sorvete.webp",
    alt: "Brownie de chocolate com bola de sorvete de creme e calda",
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
          de um terço. A ordem no HTML é a da leitura: prato, massa, carne. */}
      <ul role="list" className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FOTOS.map((foto, i) => (
          <Reveal as="li" key={foto.src} delay={(i % 4) * 90}>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-muted">
              <Image
                src={foto.src}
                alt={foto.alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
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
