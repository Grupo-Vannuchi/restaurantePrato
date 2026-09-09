import Image from "next/image";
import { useTranslations } from "next-intl";

import { formatBRL, pastaChoices, type PastaExtra } from "@/config/menu";

/**
 * Como se monta um prato na ilha de massas.
 *
 * **Por que ele existe:** a seção de massas dependia de haver massa cadastrada
 * no banco, e o banco está vazio — então ela nunca aparecia. Quem lia o cardápio
 * não descobria que a ilha existe, que é justamente a informação capaz de fazer
 * alguém atravessar o salão até ela. O passo a passo vem do cardápio da casa,
 * que é código, e não de registro cadastrado: aparece sempre.
 *
 * **A trilha numerada não é enfeite.** A seção está dizendo uma ORDEM — massa,
 * preparo, molho, ingredientes —, que é a ordem em que o cliente escolhe, de pé
 * na frente do cozinheiro. A linha ligando um passo ao seguinte desenha isso.
 *
 * A trilha só existe a partir de `sm`. No celular ela custava 52 px de recuo
 * (círculo de 40 mais o vão) em cada linha, numa tela de 390 — um oitavo da
 * largura gasto para desenhar uma calha vazia. Ali o número passa para a mesma
 * linha do título e o cartão ocupa a coluna inteira.
 *
 * A linha vertical é `flex-1`: estica sozinha até o próximo círculo, sem altura
 * fixa que desalinhe quando as opções quebram em mais linhas.
 *
 * As opções usam a mesma linha do resto do cardápio — moldura única, fio fino
 * entre uma e outra, nome em serifa. Numa página inteira de listas, um bloco de
 * pílulas arredondadas seria a coisa que não pertence.
 *
 * ⚠️ **Síncrono de propósito**, como o `MenuHero`: ele não busca nada. Um
 * componente assíncrono sem espera é um que este setup de teste não consegue
 * renderizar, e a seção ficaria sem cobertura por um `async` que não faz nada.
 *
 * ⚠️ **Os adicionais chegam por parâmetro, não lidos da configuração.** Lendo a
 * configuração, o teste só exercitaria o estado de hoje — sem preço — e o
 * caminho com preço estrearia sem nunca ter rodado, no dia em que ninguém
 * estiver olhando. Mesma decisão do `PriceCallout`.
 *
 * ⚠️ **Faixa de fotos, e não carrossel.** O projeto irmão abre a seção com um
 * carrossel; aqui as três aparecem de uma vez. Um carrossel mostra uma massa e
 * esconde duas, e cobra por isso autoplay com pausa (WCAG 2.2.2), setas,
 * marcadores e foco — a mesma maquinaria cujos defeitos latentes custaram uma
 * manhã no carrossel da home. Para três fotos, a grade mostra mais e não tem
 * como travar.
 */
export function PastaBuilder({
  extras,
  photos,
}: {
  extras: readonly PastaExtra[];
  photos: readonly { photo: string; name: string }[];
}) {
  const t = useTranslations("cardapio");

  /** Cada passo traz opções **ou** uma nota — nunca os dois. */
  const passos: { titulo: string; opcoes?: readonly string[]; nota?: string }[] = [
    { titulo: t("pastaShapes"), opcoes: pastaChoices.shapes },
    { titulo: t("pastaPreparation"), opcoes: pastaChoices.preparation },
    { titulo: t("pastaSauces"), opcoes: pastaChoices.sauces },
    {
      titulo: t("pastaIngredients"),
      nota: t("pastaIngredientsNote", { n: pastaChoices.ingredientLimit }),
    },
  ];

  return (
    <div className="mt-10">
      {/* Sem foto a faixa inteira some, em vez de reservar três quadrados
          vazios — foi assim que a seção nasceu, e é para onde ela volta se
          alguém apagar os arquivos. */}
      {photos.length > 0 ? (
        <ul className="mb-12 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {photos.map((foto) => (
            <li key={foto.photo} className="overflow-hidden rounded-2xl">
              <Image
                src={foto.photo}
                alt={t("dishImageAlt", { name: foto.name })}
                width={1100}
                height={619}
                loading="lazy"
                sizes="(min-width: 640px) 33vw, 100vw"
                className="aspect-[4/3] w-full object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}

      <h3 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
        {t("pastaBuild")}
      </h3>
      <p className="mt-2 max-w-xl text-pretty text-muted-foreground">
        {t("pastaPortionNote", { portion: pastaChoices.portion })}
      </p>

      <ol className="mt-10">
        {passos.map((passo, i) => {
          const ultimo = i === passos.length - 1;
          return (
            <li key={passo.titulo} className="flex sm:gap-5">
              <div className="hidden flex-col items-center sm:flex" aria-hidden>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-card font-serif text-base font-bold tabular-nums text-brand">
                  {i + 1}
                </span>
                {ultimo ? null : <span className="mt-2 w-px flex-1 bg-border" />}
              </div>

              {/* `min-w-0` para as opções quebrarem em vez de empurrar a coluna
                  do número para fora da tela. */}
              <div className={`min-w-0 flex-1 pt-1.5 ${ultimo ? "" : "pb-9"}`}>
                <h4 className="flex items-center gap-2.5 font-serif text-lg font-bold leading-snug sm:text-xl">
                  {/* O mesmo número da trilha, na versão de celular. Some em
                      `sm`, onde o círculo da calha assume. */}
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-card text-sm tabular-nums text-brand sm:hidden"
                  >
                    {i + 1}
                  </span>
                  {passo.titulo}
                </h4>
                {passo.opcoes ? (
                  <ul className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                    {passo.opcoes.map((opcao) => (
                      <li
                        key={opcao}
                        className="border-b border-border px-4 py-4 last:border-b-0 sm:px-6"
                      >
                        <p className="font-serif text-base font-bold leading-snug sm:text-lg">
                          {opcao}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-pretty leading-relaxed text-muted-foreground">
                    {passo.nota}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Adicionais: a exceção à regra de que o preço é da seção — são cobrados
          por unidade. Some inteiro sem valor, porque uma linha de proteína sem
          preço no meio de um cardápio lê como incluso. */}
      {extras.length > 0 ? (
        <>
          <h3 className="mt-12 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
            {t("pastaExtras")}
          </h3>
          <ul className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            {extras.map((extra) => (
              <li
                key={extra.name}
                className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="font-medium">{extra.name}</p>
                  <p className="text-sm text-muted-foreground">{extra.weight}</p>
                </div>
                <p className="shrink-0 font-serif font-bold tabular-nums text-brand">
                  {formatBRL(extra.price)}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
