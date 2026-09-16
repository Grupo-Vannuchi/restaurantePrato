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
export function DishRow({
  dish,
  nivel = 3,
}: {
  dish: DishView;
  /**
   * O nível do título do prato na árvore da página.
   *
   * ⚠️ **Precisa ser parâmetro porque a linha aparece em DUAS profundidades.**
   * Na ilha de massas ela fica direto sob o título da seção, e `h3` é o certo.
   * No buffet ela fica sob a categoria, que fica sob o dia — três degraus, e
   * `h3` ali empatava o nome do PRATO com o nome da CATEGORIA que o agrupa.
   *
   * O padrão continua 3: quem não sabe em que profundidade está recebe o caso
   * raso, que é o que a ilha de massas usa.
   */
  nivel?: 3 | 4;
}) {
  const texto = dish.descriptionLong || dish.description;
  const Titulo = `h${nivel}` as "h3" | "h4";

  return (
    <li className="border-b border-border px-5 py-4 last:border-b-0 sm:px-6">
      {/* Um degrau acima do que era (`base`/`lg`), alinhando com o projeto
          irmão: este cardápio é lido EM PÉ, no celular, com o código escaneado
          na mesa. O nome do prato precisa sair de relance. */}
      {/* O TAMANHO não muda com o nível: o nome do prato tem o mesmo peso
          visual nos dois lugares, e o que muda é só a posição dele na árvore
          de títulos. Nível de título é estrutura, tamanho de letra é desenho —
          amarrar os dois é o que faz gente escolher `h4` para deixar menor. */}
      <Titulo className="font-serif text-lg font-bold leading-snug sm:text-xl">
        {dish.name}
      </Titulo>
      {texto ? (
        <p className="mt-1 text-pretty text-base leading-relaxed text-muted-foreground">
          {texto}
        </p>
      ) : null}
    </li>
  );
}
