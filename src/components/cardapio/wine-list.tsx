import { useTranslations } from "next-intl";

import { formatBRL, type Wine } from "@/config/menu";

/**
 * A carta de vinhos.
 *
 * Segue o desenho das bebidas — nome à esquerda, preço à direita — mas com **um
 * nível a mais**, e é esse nível que justifica a seção existir separada: bebida
 * é um nome para um preço; vinho é um rótulo para várias doses.
 *
 * Por isso o rótulo vira título do bloco e as doses viram as linhas. Enfileirar
 * "Del Grano taça" e "Del Grano meia taça" como itens irmãos, no formato das
 * bebidas, faria a carta anunciar dois vinhos diferentes com nomes quase
 * iguais: quem lê na mesa contaria seis rótulos onde existem dois. A página
 * desenharia, os preços estariam certos, e a informação estaria errada.
 * `test/a-carta-de-vinhos.test.tsx` guarda a estrutura por isso, e não os
 * textos — um refator que achatasse a lista passaria por qualquer asserção de
 * conteúdo.
 *
 * A linha importada tem quatro rótulos ao mesmo preço, e eles saem como uma
 * linha de apoio sob o título. Sem eles a carta diria "Importado" e não diria o
 * que se está bebendo.
 *
 * Sem vinho cadastrado sai a frase de apoio, não uma moldura vazia: moldura
 * vazia lê como conteúdo que falhou ao carregar, e a frase diz que a carta
 * existe e ainda não foi digitada. É a diferença entre "o site está quebrado" e
 * "pergunte ao garçom".
 *
 * ⚠️ Síncrono e com os vinhos por parâmetro, como o `PastaBuilder` e o
 * `PriceCallout`: é o que permite exercitar os dois estados hoje, em vez de só
 * aquele que por acaso está configurado.
 */
export function WineList({ wines }: { wines: readonly Wine[] }) {
  const t = useTranslations("cardapio");

  if (wines.length === 0) {
    return (
      <p className="mt-6 max-w-xl text-pretty text-muted-foreground">
        {t("winesPending")}
      </p>
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-10">
      {wines.map((vinho) => (
        <div key={vinho.name}>
          <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-serif text-xl font-bold tracking-tight sm:text-2xl">
            {vinho.name}
            {vinho.note ? (
              <span className="font-sans text-sm font-medium tracking-normal text-muted-foreground">
                {vinho.note}
              </span>
            ) : null}
          </h3>

          {vinho.labels ? (
            <p className="mt-2 text-pretty text-sm text-muted-foreground">
              {vinho.labels.join(" · ")}
            </p>
          ) : null}

          <ul role="list" className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
            {vinho.servings.map((dose) => (
              <li
                key={dose.label}
                className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-4 last:border-b-0 sm:px-6"
              >
                {/* `min-w-0` para o nome quebrar em vez de empurrar o preço. */}
                <div className="min-w-0">
                  <p className="font-medium">{dose.label}</p>
                  {dose.volume ? (
                    <p className="text-sm text-muted-foreground">{dose.volume}</p>
                  ) : null}
                </div>
                <p className="shrink-0 font-serif font-bold tabular-nums text-brand">
                  {formatBRL(dose.price)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
