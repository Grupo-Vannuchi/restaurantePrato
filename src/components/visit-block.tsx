import { getTranslations } from "next-intl/server";
import { MapPin, Clock } from "lucide-react";
import { fullAddress, openingHoursLabel } from "@/config/site";
import { ReserveButton } from "@/components/reserve-button";

/**
 * O bloco que fecha cada novidade: onde fica, que horas abre, e o convite para
 * reservar.
 *
 * Ele preenche um vazio que abrimos: em 27/08 saiu daqui a tabela que afirmava
 * atender 171 bairros e cidades de São Paulo — herança da agência, e um fato
 * que ninguém confirmou. A remoção estava certa, mas deixou o artigo terminando
 * em nada, logo abaixo do texto que a pessoa acabou de ler.
 *
 * Compacto de propósito, e duplicando o rodapé de propósito: o mesmo endereço e
 * horário aparecem poucas centenas de pixels abaixo, com o mapa. Este bloco não
 * está aqui para informar pela primeira vez — está para pegar quem terminou de
 * ler e está decidindo se vem.
 *
 * ⚠️ **O horário vem de `openingHoursLabel()`, e nunca de uma string.** O
 * projeto irmão lê uma chave do catálogo neste mesmo bloco; aqui isso é
 * proibido. Dois consumidores já montaram a linha só com `opens`/`closes` e
 * renderizaram "Aberto das 11h às 15h" — que afirma, para quem lê, que a casa
 * abre todo dia. O Prato fecha no fim de semana, e a frase sem os dias manda o
 * visitante para a porta fechada no sábado.
 *
 * O ajudante devolve `null` quando não há horário configurado (`openingHours` é
 * opcional no tipo, de propósito), e aí a linha inteira some em vez de mostrar
 * um rótulo seguido de nada.
 *
 * Endereço e horário saem de `siteConfig`, nunca copiados: uma cópia no fim de
 * todo artigo sobreviveria a uma mudança de endereço.
 */
export async function VisitBlock() {
  const t = await getTranslations("novidades");
  const tReservas = await getTranslations("reservas");

  const horario = openingHoursLabel();

  return (
    <section className="mt-16 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h2 className="font-serif text-2xl font-bold tracking-tight">
        {t("visitTitle")}
      </h2>

      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <div>
            <dt className="text-sm font-medium text-muted-foreground">
              {tReservas("addressLabel")}
            </dt>
            <dd className="mt-0.5 text-pretty">{fullAddress()}</dd>
          </div>
        </div>

        {horario ? (
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {tReservas("hoursLabel")}
              </dt>
              <dd className="mt-0.5">{horario}</dd>
            </div>
          </div>
        ) : null}
      </dl>

      <div className="mt-6">
        <ReserveButton size="lg" />
      </div>
    </section>
  );
}
