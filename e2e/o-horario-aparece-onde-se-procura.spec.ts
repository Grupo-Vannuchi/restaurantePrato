import { expect, test } from "@playwright/test";

import { openingHoursLabel } from "../src/config/site";

/**
 * O horário aparece no rodapé de toda página, e na página de contato.
 *
 * "Estão abertos agora?" é a pergunta que traz alguém ao site de um restaurante
 * na hora do almoço. O horário estava publicado em `/reservas`, na abertura do
 * cardápio e no `llms.txt` — e faltava justamente nos dois lugares onde ele é
 * procurado primeiro: o RODAPÉ, que acompanha o visitante nas sete páginas, e a
 * página de CONTATO, onde quem quer falar com a casa também quer saber se ela
 * está aberta.
 *
 * O projeto irmão publica os dois. Foi comparando os catálogos, a pedido do dono
 * do projeto, que a falta apareceu.
 *
 * ⚠️ **O texto esperado vem de `openingHoursLabel()`, não escrito aqui.** Pôr
 * "Seg a sex, das 11h às 15h" no teste faria dele uma segunda fonte do horário
 * do cliente: no dia em que a casa mudar de expediente, o site mudaria e o teste
 * continuaria exigindo o horário antigo. `config/site.ts` é um arquivo puro, sem
 * import nenhum, então dá para lê-lo daqui.
 *
 * ⚠️ **E o helper é a única fonte permitida.** Ele inclui a faixa de DIAS de
 * propósito: formatar a partir de `opens`/`closes` publicaria "das 11h às 15h"
 * sem dizer que a casa fecha no fim de semana, que é o defeito que manda alguém
 * até a porta fechada num sábado. `test/so-o-helper-formata-o-horario.test.ts`
 * varre a fonte atrás de quem tentar montar isso à mão.
 */
const ROTAS = [
  "/",
  "/cardapio",
  "/galeria",
  "/reservas",
  "/experiencia",
  "/contato",
  "/novidades",
];

const HORARIO = openingHoursLabel();

test.describe("o horário publicado", () => {
  // Sentinela: sem horário configurado não há nada para exigir, e o teste
  // inteiro perderia sentido em silêncio.
  test.skip(!HORARIO, "sem horário em siteConfig.openingHours");

  for (const rota of ROTAS) {
    test(`aparece no rodapé de ${rota}`, async ({ page }) => {
      await page.goto(rota, { waitUntil: "domcontentloaded" });

      /*
       * Dentro do `<footer>`, e não em qualquer lugar da página: em `/reservas`
       * e em `/cardapio` o horário já aparece no corpo, e procurar na página
       * toda faria o teste passar por causa daquele outro — exatamente o
       * estado anterior a esta correção.
       */
      const rodape = page.locator("footer");
      await expect(rodape).toBeVisible();
      await expect(
        rodape.getByText(HORARIO!, { exact: false }).first(),
        `o rodapé de ${rota} não publica o horário ("${HORARIO}")`,
      ).toBeAttached();
    });
  }

  test("aparece na lista de contatos da página de contato", async ({ page }) => {
    await page.goto("/contato", { waitUntil: "domcontentloaded" });

    // Fora do rodapé: é a lista de canais, no corpo da página.
    const corpo = page.locator("main");
    await expect(
      corpo.getByText(HORARIO!, { exact: false }).first(),
      `a página de contato não publica o horário fora do rodapé ("${HORARIO}")`,
    ).toBeAttached();
  });
});
