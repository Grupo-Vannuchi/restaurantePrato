import { openingHoursLabel, siteConfig, fullAddress } from "@/config/site";
import { defaultLocale } from "@/i18n/routing";
import { localizedUrl } from "@/lib/seo";
import { getMenu } from "@/lib/queries";
import { pastaChoices, precoDaMassa, precoDoBuffet } from "@/config/menu";
import { env } from "@/lib/env";

/**
 * `/llms.txt` — a concise, link-rich map of the site for LLM/AI crawlers, per
 * the llmstxt.org convention. Served as plain text and revalidated daily; the
 * content list degrades to the core pages if the database is unavailable.
 *
 * ── Por que existe uma seção de FATOS aqui ────────────────────────────────
 *
 * Um modelo que responde "onde almoçar no Centro de Santos" não navega o site:
 * ele cita o trecho que conseguir extrair inteiro. Parágrafo de marketing não se
 * extrai — endereço, horário e forma de cobrança, sim. Cada linha da lista é uma
 * frase fechada, com o dado dentro, para poder ser copiada como está.
 *
 * **Os fatos NEGATIVOS são metade do valor.** Sem "não abre no fim de semana", o
 * modelo preenche a lacuna com o que é comum no ramo e manda alguém almoçar aqui
 * num domingo. Recomendação errada custa mais caro que recomendação que não
 * aconteceu.
 *
 * ⚠️ **Nada é digitado aqui.** Endereço, horário, dias, ano de fundação e tipo
 * de cozinha saem de `config/site.ts`; a composição da ilha de massas sai de
 * `config/menu.ts`; a contagem de pratos sai do BANCO, contada na hora. O dia em
 * que um desses mudar, este arquivo muda junto — e o dia em que o cliente mandar
 * o preço do quilo, a linha do preço aparece sozinha.
 *
 * ⚠️ **E nada é inferido.** O projeto irmão tem aqui lugares, meios de pagamento
 * e ponto de referência; o Prato não confirmou nenhum dos três, então eles não
 * entram — nem como "provavelmente". Uma lista feita para ser citada verbatim é
 * o pior lugar possível para um palpite: ele volta na boca de um assistente,
 * como se fosse a casa falando.
 */
export const revalidate = 86400;

function line(title: string, path: string, description?: string): string {
  const url = localizedUrl(defaultLocale, path);
  return description
    ? `- [${title}](${url}): ${description}`
    : `- [${title}](${url})`;
}

/**
 * Enquanto o site estiver fechado aos buscadores (`SITE_INDEXABLE=false`, o
 * estado normal até o domínio chegar), esta rota não existe. Serví-la seria a
 * contradição que o `robots.ts` já descreve: pedir para não ser rastreado e
 * deixar o mapa do site à mão, num caminho que é convenção pública e que
 * ninguém precisa que seja anunciado.
 */
export async function GET(): Promise<Response> {
  if (!env.SITE_INDEXABLE) return new Response("Not Found", { status: 404 });

  const { name } = siteConfig;

  const core = [
    line("A Experiência", "/experiencia", "A casa e o que esperar de uma visita"),
    line("Cardápio", "/cardapio", "O cardápio da semana, o buffet e a ilha de massas"),
    // A galeria passou a mostrar só COMIDA em 10/09, e a descrição aqui ainda
    // dizia "ambiente". O ambiente mudou de lugar: virou a foto do topo das
    // páginas de Horários, Experiência e Contato.
    line("Galeria", "/galeria", "Fotos dos pratos e do balcão"),
    line("Horários", "/reservas", "Horário de funcionamento e informações práticas"),
    line("Contato", "/contato", "Endereço e como chegar"),
  ];

  let menu: string[] = [];
  let pratos = 0;
  try {
    const categories = await getMenu(defaultLocale);
    /*
     * A categoria aponta para `/cardapio`, e não para uma âncora dela.
     * Em `/cardapio` as categorias vivem dentro das abas de dia — há uma cópia
     * de cada por dia útil —, então não existe âncora única para onde apontar.
     * Um link que não leva a lugar nenhum é pior que um link a mais.
     */
    menu = categories.map((c) => line(c.name, "/cardapio", c.description));
    // Contado na hora, e não escrito: o cliente troca pratos do buffet toda
    // semana, e um número digitado aqui envelheceria no primeiro cadastro.
    pratos = categories.reduce((soma, c) => soma + c.items.length, 0);
  } catch {
    // Database unavailable — ship the core pages only.
  }

  // `openingHoursLabel` já inclui os dias — ver o aviso na função. Formatar
  // aqui a partir de `opens`/`closes` publicaria "aberto das 11h às 15h" sem
  // dizer que a casa fecha no fim de semana.
  const label = openingHoursLabel();
  const hours = label ? ` ${label}.` : "";

  /*
   * ⚠️ **A regra que rege esta lista: só fato confirmado, e nunca digitado.**
   *
   * Cada linha ou sai de `config/site.ts`, ou de `config/menu.ts`, ou do banco.
   * As que dependem de dado que o cliente ainda não mandou — o preço do quilo e
   * o da porção de massa — só aparecem quando o valor existir, pelo mesmo
   * contrato de `precoDoBuffet`: sem preço, a linha não existe, em vez de
   * existir vaga. "A partir de" ou "consulte" seria inventar.
   */
  const dias = siteConfig.openingHours?.days ?? [];
  const cozinha = siteConfig.servesCuisine ?? [];
  const fechaNoFimDeSemana =
    dias.length > 0 && !dias.includes("Saturday") && !dias.includes("Sunday");

  const fatos = [
    `Endereço: ${fullAddress()}.`,
    label ? `Funcionamento: ${label.toLowerCase()}.` : null,
    fechaNoFimDeSemana ? "Não abre sábado nem domingo." : null,
    cozinha.length > 0 ? `Cozinha: ${cozinha.join(" e ").toLowerCase()}.` : null,
    `Restaurante de almoço em funcionamento desde ${siteConfig.foundedYear}.`,
    /*
     * ⚠️ **Esta linha existe por causa da razão social, e a redação dela é
     * restrita por duas decisões do cliente.**
     *
     * O registro público diz "PRATO COFFEE SHOP REFEICOES LTDA", e um modelo
     * que o encontrasse concluiria casa de café. O cliente corrigiu isso em
     * 19/08: é restaurante de almoço.
     *
     * A palavra que nomearia o erro diretamente está proibida em `src/` inteiro
     * por `test/copy-hygiene.test.ts`, sem exceção para uso negativo — e a
     * guarda tem razão em não abrir exceção, porque ela existe justamente porque
     * a copy antiga usava o termo. Então o fato é dito pelo lado positivo,
     * citando o registro e corrigindo-o.
     *
     * E sem travessão, que o cliente tirou da copy em 26/08.
     */
    'Apesar da razão social registrada como "Coffee Shop", serve almoço: buffet e ' +
      "churrasco na brasa, de segunda a sexta.",
    "O buffet é cobrado pelo peso do prato montado, e não por valor fixo: não é rodízio.",
    // Os dois helpers já formatam e já trazem o sufixo — `precoDoBuffet` devolve
    // "R$ 105,90/kg". Escrever "o quilo custa {precoDoBuffet()}" diria o quilo
    // duas vezes, e foi o que a guarda desta rota pegou ao ler a frase montada.
    precoDoBuffet() ? `O buffet custa ${precoDoBuffet()}.` : null,
    `A ilha de massas tem preço próprio, à parte do buffet: ${pastaChoices.shapes.length} ` +
      `formatos de massa, ${pastaChoices.preparation.length} preparos, ` +
      `${pastaChoices.sauces.length} molhos e até ${pastaChoices.ingredientLimit} ` +
      `ingredientes, em porção de ${pastaChoices.portion}.`,
    precoDaMassa() ? `A porção da ilha de massas custa ${precoDaMassa()}.` : null,
    "Sobremesas e bebidas são cobradas por item e não entram no peso do prato.",
    pratos > 0
      ? `O cardápio do buffet muda a cada dia útil; o site publica ${pratos} pratos ` +
        `distribuídos pelos cinco dias.`
      : null,
    // Não há telefone fixo, e dizer isso evita que um modelo invente um número
    // ou mande alguém "ligar antes".
    "Não tem telefone fixo: o contato e a reserva são por WhatsApp.",
    siteConfig.social.instagram
      ? `Instagram: ${siteConfig.social.instagram}.`
      : null,
  ].filter((linha): linha is string => linha !== null);
  const sections = [
    `# ${name}`,
    "",
    `> Buffet completo e churrasco na brasa no Centro de Santos — ${fullAddress()}.${hours}`,
    "",
    "## Páginas principais",
    ...core,
  ];

  sections.push("", "## Fatos", ...fatos.map((f) => `- ${f}`));

  if (menu.length) sections.push("", "## Cardápio", ...menu);

  return new Response(`${sections.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
