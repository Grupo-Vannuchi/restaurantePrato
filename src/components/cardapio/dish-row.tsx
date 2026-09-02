import type { DishView } from "@/lib/queries";

/**
 * Uma linha do cardápio: nome, descrição, fio fino embaixo.
 *
 * **Informativa, não clicável.** O prato do buffet não tem para onde levar — a
 * descrição já diz o que ele é, e quem está na mesa quer ler a lista, não
 * navegar por ela. Uma página por prato significaria dezenas de rotas que
 * ninguém abre e que repetiriam o que já está aqui.
 *
 * **Sem foto, e de propósito.** O buffet tem dezenas de itens que mudam toda
 * semana, e reservar espaço de imagem para todos rende uma página altíssima com
 * marcador de foto ausente no lugar de comida. Foi exatamente esse o cálculo do
 * projeto irmão: a mesma quinta-feira passou de oito mil pixels de rolagem para
 * três mil quando o cardápio virou lista.
 *
 * O texto preferido é o `descriptionLong`, que é o campo escrito para a linha
 * do cardápio; a descrição curta é a do card da vitrine e serve de reserva
 * enquanto o cliente não preencher o outro.
 */
export function DishRow({ dish }: { dish: DishView }) {
  const texto = dish.descriptionLong || dish.description;

  return (
    <li className="border-b border-border px-5 py-4 last:border-b-0 sm:px-6">
      <h3 className="font-serif text-base font-bold leading-snug sm:text-lg">
        {dish.name}
      </h3>
      {texto ? (
        <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
          {texto}
        </p>
      ) : null}
    </li>
  );
}
