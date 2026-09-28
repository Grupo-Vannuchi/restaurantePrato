import { formatBRL, type DrinkGroup } from "@/config/menu";

/**
 * As bebidas de UM grupo, como no quadro do salão.
 *
 * ⚠️ **Era um componente só, que desenhava os três grupos e o título de cada um
 * como `h3`. Mudou em 28/09/2026, a pedido do dono: "quero o cardápio na mesma
 * estrutura visual do projeto irmão".**
 *
 * Lá cada grupo é uma SEÇÃO inteira — "Sucos", "Café e água" e "Refrigerantes e
 * cervejas" viram letreiro, com o espaçamento de seção e a possibilidade de foto
 * própria. Aqui eles eram subtítulos dentro de uma seção única, e o cliente já
 * tinha reclamado disso em 24/09: ele não achava os grupos ao percorrer a
 * página. Na época a resposta foi aumentar o corpo do `h3`; a estrutura do irmão
 * resolve promovendo a seção, que é a correção de verdade.
 *
 * Então este componente perdeu o título: quem o desenha agora é a `MenuSection`
 * que o embrulha, e o `h3` daqui viraria um segundo título do mesmo conteúdo.
 *
 * O preço em cada linha é o que separa esta seção das do buffet: bebida não
 * entra no valor por quilo, é cobrada à parte.
 *
 * O volume fica sob o nome, e não colado nele, porque é ele que distingue duas
 * linhas homônimas: refrigerante de 200 ml e de 350 ml são itens diferentes,
 * com preços diferentes.
 *
 * `min-w-0` no bloco de texto é o que faz o nome quebrar em vez de empurrar o
 * preço para fora da linha em telas estreitas.
 */
export function DrinkGroupList({ group }: { group: DrinkGroup }) {
  return (
    <ul
      role="list"
      className="mt-10 overflow-hidden rounded-2xl border border-border bg-card"
    >
      {group.items.map((bebida) => (
        <li
          key={`${bebida.name}-${bebida.volume}`}
          className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0 sm:px-6"
        >
          <div className="min-w-0">
            <p className="font-medium">{bebida.name}</p>
            {bebida.volume ? (
              <p className="text-sm text-muted-foreground">{bebida.volume}</p>
            ) : null}
          </div>
          <p className="shrink-0 font-serif font-bold tabular-nums text-brand">
            {formatBRL(bebida.price)}
          </p>
        </li>
      ))}
    </ul>
  );
}
