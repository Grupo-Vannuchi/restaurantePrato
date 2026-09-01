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
