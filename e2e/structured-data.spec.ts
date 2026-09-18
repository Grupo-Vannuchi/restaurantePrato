import { expect, test } from "@playwright/test";

/**
 * Dado estruturado: o que o Google lê, e o que ele **não pode** ler aqui.
 *
 * A regra permanente do projeto é que depoimento nunca entra no schema. O
 * Google proíbe *self-serving reviews* — emitir `Review` ou `aggregateRating`
 * sobre o próprio negócio, no próprio site. A punição não é o trecho perder
 * estrelas: é o resultado rico sumir inteiro.
 *
 * A tentação é concreta e volta sozinha: os depoimentos já estão na página,
 * já têm autor e fonte, e ligar um no outro parece "completar" o schema. Por
 * isso a guarda lê a **saída publicada** em vez da fonte — não importa por
 * qual caminho o dado chegue lá, ele não pode estar lá.
 */
const PAGINAS = ["/", "/cardapio", "/experiencia", "/reservas"];

/** Todo bloco de dado estruturado da página, já convertido em objeto. */
async function blocosJsonLd(page: import("@playwright/test").Page) {
  return page.$$eval('script[type="application/ld+json"]', (nodes) =>
    nodes.map((n) => JSON.parse(n.textContent ?? "null")),
  );
}

for (const rota of PAGINAS) {
  test(`${rota} não emite avaliação no dado estruturado`, async ({ page }) => {
    await page.goto(rota);
    const blocos = await blocosJsonLd(page);
    expect(blocos.length).toBeGreaterThan(0);

    // Busca em profundidade: a chave proibida não pode aparecer em nenhum
    // nível, nem dentro de um `@graph` ou de um objeto aninhado.
    const proibidas = ["review", "reviews", "aggregateRating"];
    const encontradas: string[] = [];
    const varrer = (valor: unknown, caminho: string) => {
      if (Array.isArray(valor)) return valor.forEach((v, i) => varrer(v, `${caminho}[${i}]`));
      if (valor === null || typeof valor !== "object") return;
      for (const [chave, v] of Object.entries(valor as Record<string, unknown>)) {
        if (proibidas.includes(chave.toLowerCase())) encontradas.push(`${caminho}.${chave}`);
        if (chave === "@type" && v === "Review") encontradas.push(`${caminho} é um Review`);
        varrer(v, `${caminho}.${chave}`);
      }
    };
    blocos.forEach((b, i) => varrer(b, `bloco[${i}]`));

    expect(encontradas).toEqual([]);
  });
}

test("a página inicial se declara um restaurante, com endereço e horário", async ({ page }) => {
  // O outro lado da mesma moeda: a guarda acima passaria com um schema vazio.
  await page.goto("/");
  const blocos = await blocosJsonLd(page);
  const restaurante = blocos.find((b) => b?.["@type"] === "Restaurant");

  expect(restaurante, "nenhum bloco Restaurant na página inicial").toBeTruthy();
  expect(restaurante.name).toContain("Prato");
  expect(restaurante.address?.streetAddress).toBeTruthy();
  expect(restaurante.openingHoursSpecification?.length).toBeGreaterThan(0);
});

/**
 * Os três campos que a auditoria de SEO de 17/09 achou faltando no
 * `Restaurant`, cobrados no HTML PUBLICADO — não no objeto do código.
 *
 * ⚠️ A diferença importa, e o repositório tem o exemplo: a guarda de
 * `/llms.txt` importa o handler e prova a função, enquanto a rota responde 404
 * de propósito. Aqui a página é buscada e o JSON é parseado do que saiu.
 */
test("o Restaurant leva imagem, faixa de preço e o cardápio", async ({ page }) => {
  await page.goto("/");
  const restaurante = (await blocosJsonLd(page)).find((b) => b?.["@type"] === "Restaurant");
  expect(restaurante, "nenhum bloco Restaurant na página inicial").toBeTruthy();

  // Sem `image` o resultado rico de restaurante sai sem foto. O `og:image` é
  // outro campo e não conta.
  expect(restaurante.image, "Restaurant sem `image`").toMatch(/^https?:\/\/.+\.(jpg|jpeg|png|webp)$/);

  /*
   * ⚠️ `priceRange` DERIVADO, nunca digitado. Até 17/09 ele era corretamente
   * ausente — o projeto não inventa dado de cliente e não havia preço. O
   * cliente passou R$ 94,99/kg e R$ 41,90 nessa data, então o campo deixou de
   * ser palpite. A guarda cobra a forma e o cifrão, não um valor fixo: quando
   * o preço mudar em `menuPricing`, isto tem de continuar passando sem edição.
   */
  expect(restaurante.priceRange, "Restaurant sem `priceRange`").toMatch(/^R\$\s?\d/);

  // `hasMenu` é a propriedade corrente do schema.org; `menu` é a forma antiga.
  // As duas apontam para o cardápio.
  expect(restaurante.hasMenu, "Restaurant sem `hasMenu`").toMatch(/\/cardapio$/);
  expect(restaurante.menu).toBe(restaurante.hasMenu);
});

/**
 * Os dois campos que fecharam a paridade com o projeto irmão em 18/09/2026.
 *
 * `geo` era a ÚNICA entidade de dado estruturado que o irmão emitia e este
 * projeto não — comparado `@type` por `@type` nos dois `json-ld.tsx`. Com ele, a
 * diferença que resta é `telephone`, e essa é deliberada: o Prato não tem fixo.
 */
test("o Restaurant localiza a casa e diz como se paga", async ({ page }) => {
  await page.goto("/");
  const restaurante = (await blocosJsonLd(page)).find((b) => b?.["@type"] === "Restaurant");
  expect(restaurante, "nenhum bloco Restaurant na página inicial").toBeTruthy();

  /*
   * ⚠️ A faixa é estreita de propósito: Santos/SP, não "algum lugar do Brasil".
   * Um sinal trocado ou um dígito perdido põe o restaurante no oceano ou noutro
   * continente, e `geo` é justamente o campo em que ninguém olha o valor — ele
   * não aparece na tela. A guarda é o único lugar onde esse erro apareceria.
   */
  expect(restaurante.geo?.["@type"], "geo sem @type GeoCoordinates").toBe("GeoCoordinates");
  expect(restaurante.geo?.latitude, "latitude fora de Santos").toBeGreaterThan(-24.1);
  expect(restaurante.geo?.latitude, "latitude fora de Santos").toBeLessThan(-23.8);
  expect(restaurante.geo?.longitude, "longitude fora de Santos").toBeGreaterThan(-46.5);
  expect(restaurante.geo?.longitude, "longitude fora de Santos").toBeLessThan(-46.2);

  // Os meios que o cliente confirmou. A guarda cobra a presença dos dois menos
  // óbvios — o voucher e o dinheiro —, não a string inteira, para o cliente
  // poder acrescentar um meio novo sem quebrar isto.
  expect(restaurante.paymentAccepted, "Restaurant sem `paymentAccepted`").toMatch(/Pix/i);
  expect(restaurante.paymentAccepted).toMatch(/Dinheiro/i);
});

/**
 * O `Menu` de `/cardapio`: o conteúdo real do site, agora legível por máquina.
 *
 * ⚠️ Medido no HTML PUBLICADO, e não no objeto do código, pela mesma razão das
 * guardas acima: o `og:image` deste projeto ficou dois dias apontando para um
 * 404 com build verde e página 200. `test/o-cardapio-estruturado-nao-afirma-o-dia.test.ts`
 * prova as regras da montagem; só esta prova que o bloco SAIU.
 *
 * E a varredura de avaliação no topo deste arquivo já cobre `/cardapio`, então
 * o `Menu` entra automaticamente na proibição de `review`/`aggregateRating` —
 * não há nada a acrescentar lá.
 */
test("/cardapio publica o cardápio como Menu, sem afirmar o dia", async ({ page }) => {
  await page.goto("/cardapio");
  const menu = (await blocosJsonLd(page)).find((b) => b?.["@type"] === "Menu");

  expect(menu, "nenhum bloco Menu em /cardapio").toBeTruthy();
  expect(menu["@id"], "Menu sem @id ancorado na rota").toMatch(/\/cardapio#menu$/);

  const secoes = menu.hasMenuSection;
  expect(Array.isArray(secoes), "Menu sem hasMenuSection").toBe(true);
  // O piso: com o banco semeado há categoria de buffet, massas e as listas do
  // cardápio da casa. Um número baixo aqui significa seção sumindo em silêncio.
  expect(secoes.length, "poucas seções: alguma lista deixou de entrar").toBeGreaterThan(3);

  /*
   * ⚠️ **Nenhuma seção nomeia dia da semana.** É a decisão (a) do plano de SEO,
   * cobrada na saída: o banco tem a união das duas semanas, então um eixo de dia
   * afirmaria a lista errada num dia específico.
   */
  const dias = /segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo/i;
  for (const secao of secoes) {
    expect(secao.name, `a seção "${secao.name}" nomeia um dia`).not.toMatch(dias);
  }

  const itens = secoes.flatMap((s: { hasMenuItem?: unknown[] }) => s.hasMenuItem ?? []);
  expect(itens.length, "Menu sem item nenhum").toBeGreaterThan(20);

  /*
   * ⚠️ **Nenhum item de buffet com preço, e é o que este trecho cobra de fato.**
   * O buffet é cobrado por peso. Todo `Offer` que existir tem de vir em BRL e com
   * valor positivo — um `price: 0` diria "de graça", que é o jeito silencioso de
   * publicar preço errado.
   */
  const ofertas = itens.flatMap((i: { offers?: unknown[] }) => i.offers ?? []);
  expect(ofertas.length, "nenhuma oferta: os preços do cliente não chegaram ao schema").toBeGreaterThan(0);
  for (const oferta of ofertas as { price: string; priceCurrency: string }[]) {
    expect(oferta.priceCurrency).toBe("BRL");
    expect(Number(oferta.price), `preço inválido: ${oferta.price}`).toBeGreaterThan(0);
  }

  // E o `Restaurant` continua apontando para a rota — o `hasMenu` não virou
  // objeto embutido, que duplicaria a entidade que este bloco já declara.
  const restaurante = (await blocosJsonLd(page)).find((b) => b?.["@type"] === "Restaurant");
  expect(restaurante?.hasMenu).toMatch(/\/cardapio$/);
});
