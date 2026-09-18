import { useTranslations } from "next-intl";

import {
  PastaCarousel,
  type PastaPhoto,
} from "@/components/cardapio/pasta-carousel";

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
 * ⚠️ **Carrossel, e não grade — a seção mudou em 09/09, a pedido.** Ela nasceu
 * como faixa de três fotos lado a lado, e eu havia argumentado contra o
 * carrossel: ele mostra uma massa e esconde duas, e cobra a maquinaria cujos
 * defeitos latentes custaram uma manhã no carrossel da home.
 *
 * Metade do argumento estava errada, e o registro importa mais que o acerto.
 * Este carrossel **não tem autoplay**: o deslize é `scroll-snap` nativo, o dedo
 * funciona sem JavaScript, e o script só acrescenta setas e marcadores. Sem
 * movimento automático não existe a exigência de pausa da WCAG 2.2.2, que era o
 * custo que eu tinha citado. Eu havia assumido autoplay por analogia com o da
 * home, sem ler o do projeto irmão.
 */
export function PastaBuilder({
  extras,
  photos,
}: {
  extras: readonly PastaExtra[];
  photos: readonly { photo: string; name: string }[];
}) {
  const t = useTranslations("cardapio");

  /* O texto alternativo é montado aqui, no servidor, porque é ele que tem o
     catálogo — o carrossel é componente de cliente e recebe a frase pronta. */
  const slides: PastaPhoto[] = photos.map((f) => ({
    image: f.photo,
    alt: t("dishImageAlt", { name: f.name }),
  }));

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
      {/* Sem foto o carrossel inteiro some, em vez de reservar um quadro
          vazio — foi assim que a seção nasceu, e é para onde ela volta se
          alguém apagar os arquivos. */}
      {slides.length > 0 ? (
        <div className="mb-12">
          <PastaCarousel
            photos={slides}
            labels={{
              carousel: t("pastaCarousel"),
              prev: t("pastaPrevPhoto"),
              next: t("pastaNextPhoto"),
              // O rótulo de cada marcador é montado no cliente, que não tem o
              // catálogo: mandamos o molde e ele troca o {n}.
              goTo: t("pastaGoToPhoto", { n: "{n}" }),
            }}
          />
        </div>
      ) : null}

      <h3 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
        {t("pastaBuild")}
      </h3>
      <p className="mt-2 max-w-xl text-pretty text-muted-foreground">
        {t("pastaPortionNote", { portion: pastaChoices.portion })}
      </p>

      <ol role="list" className="mt-10">
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
                  <ul role="list" className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                    {passo.opcoes.map((opcao) => (
                      <li
                        key={opcao}
                        className="border-b border-border px-4 py-4 last:border-b-0 sm:px-6"
                      >
                        {/* Acompanha o `DishRow`: as duas listas caem uma sob
                            a outra na mesma página, e tamanhos diferentes
                            fariam a ilha parecer menos importante que o
                            buffet. Se um mudar, o outro muda junto. */}
                        <p className="font-serif text-lg font-bold leading-snug sm:text-xl">
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
          <ul role="list" className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
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
