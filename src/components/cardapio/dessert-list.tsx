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
 * ⚠️ **A taxa de embalagem para viagem ainda não está aqui.** No quadro ela
 * aparece em corpo miúdo sob as duas saladas de frutas, e o valor não se lê na
 * foto. Ela é nota da seção, dita uma vez — ao lado do preço da sobremesa
 * virariam dois "R$" na mesma linha, um deles não sendo o que a sobremesa
 * custa. Entra junto com os preços.
 */
export async function DessertList() {
  const t = await getTranslations("cardapio");

  return (
    <ul className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
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
            <h3 className="font-serif text-base font-bold leading-snug sm:text-lg">
              {sobremesa.name}
            </h3>
            {sobremesa.note ? (
              <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
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
