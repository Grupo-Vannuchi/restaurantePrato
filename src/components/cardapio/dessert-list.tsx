import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { desserts, formatBRL } from "@/config/menu";

/**
 * As sobremesas, com preço por item.
 *
 * Mesma linha do resto do cardápio — nome em serifa, observação embaixo — mais
 * a foto à esquerda e o preço à direita. Sobremesa não entra no valor por
 * quilo, e o preço na linha é o que diz isso sem precisar de aviso.
 *
 * **Tem foto, ao contrário da linha do buffet, e os dois casos são coerentes.**
 * O `DishRow` recusa imagem porque o buffet tem dezenas de itens que trocam
 * toda semana: reservar espaço para todos rende uma página altíssima cheia de
 * marcador de foto ausente. A sobremesa é lista curta e fixa, então a foto
 * cabe. A foto continua opcional na linha — uma sobremesa nova entra no
 * cardápio antes de passar pelo fotógrafo, e sem foto o texto ocupa a largura
 * toda em vez de deixar um quadrado vazio reservado.
 *
 * ⚠️ **A taxa de embalagem para viagem JÁ está aqui, e o comentário anterior
 * dizia o contrário — corrigido em 11/09.**
 *
 * Ela chegou em 03/09, quando a foto do quadro em alta resolução tornou legível
 * o corpo miúdo sob as duas saladas de frutas. Mas ela entrou na NOTA de cada
 * item ("220 g · para viagem R$ 8,50"), e não como nota da seção — que é
 * exatamente a forma contra a qual o comentário antigo argumentava, porque põe
 * dois valores na mesma linha e um deles não é o que a sobremesa custa.
 *
 * Fica como está, e o motivo é que a taxa não é uma só: 8,50 na salada inteira
 * e 13,00 na meia porção. Nota de seção teria de dizer as duas, e aí a pessoa
 * precisa descobrir qual se aplica a qual — pior que ler as duas na linha delas.
 *
 * ⚠️ O que vale conferir com o cliente é outra coisa, e está na lista de
 * pendências: a MEIA porção de salada de frutas custa R$ 11,00 contra R$ 8,00 da
 * inteira, e a viagem dela 13,00 contra 8,50. A leitura do quadro foi conferida;
 * a inversão é do quadro, não da transcrição.
 */
export async function DessertList() {
  const t = await getTranslations("cardapio");

  return (
    <ul role="list" className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
      {desserts.map((sobremesa) => (
        <li
          key={sobremesa.name}
          className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0 sm:gap-5 sm:px-6"
        >
          {sobremesa.photo ? (
            <Image
              src={sobremesa.photo}
              alt={t("dishImageAlt", { name: sobremesa.name })}
              width={320}
              height={320}
              loading="lazy"
              sizes="96px"
              className="size-20 shrink-0 rounded-xl object-cover sm:size-24"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            {/* Consequência dos dois acima, não escolha isolada: a sobremesa
                cai na mesma página, logo abaixo do cardápio da semana e da
                ilha. Uma seção menor que as vizinhas não lê como desenho, lê
                como esquecimento. */}
            <h3 className="font-serif text-lg font-bold leading-snug sm:text-xl">
              {sobremesa.name}
            </h3>
            {sobremesa.note ? (
              <p className="mt-1 text-pretty text-base leading-relaxed text-muted-foreground">
                {sobremesa.note}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 font-serif font-bold tabular-nums text-brand">
            {formatBRL(sobremesa.price)}
          </p>
        </li>
      ))}
    </ul>
  );
}
