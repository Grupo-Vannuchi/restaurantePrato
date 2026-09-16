import { expect, test } from "@playwright/test";

/**
 * Nenhuma página rola para o lado — nem estreita, nem com a fonte ampliada.
 *
 * Rolagem horizontal num site de restaurante não é incômodo estético: é metade
 * do cardápio fora da tela de quem está de pé, no Centro, com o telefone numa
 * mão. E some da vista de quem desenvolve, porque no monitor sobra largura.
 *
 * **Dois cenários, e cada um é um critério diferente da WCAG:**
 *
 * - **320 px de largura, texto normal** — WCAG 1.4.10 (Refluxo, AA). 320 px é o
 *   piso que o critério nomeia, equivalente a 1280 px com zoom de 400%.
 * - **A largura do próprio projeto, texto em 200%** — WCAG 1.4.4 (Redimensionar
 *   texto, AA). Roda a 412 px no projeto `celular` e a 1280 no `chromium`.
 *
 * ⚠️ **O primeiro cenário JÁ PASSAVA quando esta guarda foi escrita, e isso
 * está registrado de propósito.** Medindo as seis páginas a 320 px com texto
 * normal, todas davam 320 de rolagem contra 320 de largura. Quem procurar aqui o
 * defeito que motivou o arquivo não vai achá-lo nesse cenário — ele aparecia no
 * segundo, e só ali. Guardar os dois é o que impede alguém de "simplificar" o
 * teste removendo justamente o que pega algo.
 *
 * ── O defeito que motivou o arquivo ──────────────────────────────────────
 *
 * `/contato` rolava 34 px para o lado numa tela de 412 com o texto em 200%
 * (446 contra 412). A 320 px, 446 contra 320.
 *
 * A causa não estava no formulário: estava na GRADE em volta dele.
 * `grid` sem coluna base declarada cria uma coluna implícita `auto`, que se
 * dimensiona pelo conteúdo — e um `<input>` tem largura intrínseca grande, o
 * `size` padrão do navegador, coisa de vinte caracteres. Com a fonte em 32 px
 * isso dá ~400 px, e a coluna inteira passou a medir 406: os campos, os
 * rótulos, o botão e o título herdaram essa largura, todos com `w-full`, que
 * obedientemente preencheu uma coluna larga demais.
 *
 * `grid-cols-1` é `repeat(1, minmax(0, 1fr))` no Tailwind, e o **zero** é a
 * parte que resolve: ele autoriza a coluna a encolher abaixo do conteúdo. Nove
 * grades do projeto dependiam da coluna implícita, inclusive a do rodapé — que
 * aparecia nas seis páginas, porque o rodapé é de todas.
 *
 * Um décimo lugar tinha `lg:grid-cols-[minmax(0,1fr)_18rem]` escrito à mão em
 * `/novidades/[slug]`: alguém já havia tropeçado nisto antes e resolvido só ali.
 *
 * O outro lado do mesmo par são as palavras que não quebram: `pratocoffee@gmail.com`
 * é um token de 21 caracteres que mede ~300 px com a fonte dobrada, e o rodapé
 * tem 240 px úteis numa tela de 320 — o recuo do container é em `rem` e dobra
 * junto com a fonte, então sobra menos, não mais. `break-words` no valor e
 * `min-w-0` na coluna: um sem o outro não resolve.
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

/**
 * O que rolou para fora, em linguagem de quem vai consertar: só as FOLHAS, que
 * são as que dizem qual conteúdo não caberia, e não a pilha de `div` que apenas
 * herdou a largura.
 */
async function culpados(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const doc = document.scrollingElement!;
    const fora: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const b = el.getBoundingClientRect();
      if (b.right <= doc.clientWidth + 1 || b.width === 0 || el.children.length) continue;
      // Decoração `absolute` fora da tela é intencional (o borrão do cartão) e
      // não produz rolagem: a seção a recorta.
      if (getComputedStyle(el).position === "absolute") continue;
      const e = el as HTMLElement;
      const classe = String(e.className || "").split(" ").slice(0, 2).join(".");
      fora.push(
        `${e.tagName.toLowerCase()}${classe ? `.${classe}` : ""} ` +
          `[${Math.round(b.width)}px, borda direita em ${Math.round(b.right)}] ` +
          `"${(el.textContent ?? "").trim().slice(0, 30)}"`,
      );
    }
    return fora.slice(0, 6);
  });
}

async function mede(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const doc = document.scrollingElement!;
    return {
      rolagem: doc.scrollWidth,
      largura: doc.clientWidth,
      altura: doc.scrollHeight,
    };
  });
}

for (const rota of ROTAS) {
  test(`${rota} não rola para o lado a 320 px`, async ({ page }) => {
    /*
     * ⚠️ **PENDENTE, e o tempo folgado aqui é diagnóstico, não conserto.**
     *
     * Este teste mede LARGURA — `scrollWidth <= clientWidth`, o piso da WCAG
     * 1.4.10 — e no caminho LOCAL ele reprova por TEMPO em `/cardapio`, num
     * dos dois projetos, em toda execução completa de 16/09. Quem mede tempo é
     * `performance.spec.ts`, com orçamento próprio; reprovar por aqui manda
     * quem depura procurar o defeito errado, e é por isso que a folga subiu.
     *
     * O que a folga PROVOU, e é o motivo de ela ficar: com 30 s a mensagem era
     * só "Test timeout of 30000ms exceeded", ambígua entre página lenta e
     * página travada. Com 120 s ela continua estourando — `page.goto`
     * esperando `load` em `/cardapio` passa de dois minutos — e a captura de
     * tela do Playwright mostra a PÁGINA RENDERIZADA, com o link "Pular para o
     * conteúdo" no lugar. Não é lentidão: o evento `load` não chega.
     *
     * É a mesma assinatura que derrubou o site em 15/09, quando o otimizador
     * pendurava uma conversão AVIF e a marca `priority` do cabeçalho segurava
     * o `load` da página inteira. O AVIF saiu naquele dia; a 320 px o
     * navegador pede larguras de imagem que nenhuma outra medição deste
     * repositório pede — a varredura de contraste roda em 390, 1440 e 1920 —, e
     * a lição escrita então foi exatamente esta: **mexer no layout sorteia
     * combinações de (arquivo, largura) novas.**
     *
     * ⚠️ Três hipóteses foram medidas e DESCARTADAS, para ninguém repetir:
     * · não é o limite de 30 s — estoura igual com 120 s;
     * · não é contenção de compilação — sozinho contra servidor recém-subido o
     *   teste passa em 7,0 s, e as dezesseis rotas do aquecimento pedidas em
     *   paralelo voltam todas com o status certo;
     * · não é `.next` reaproveitado depois de um `taskkill` — reiniciado sem
     *   apagar o diretório, `/`, `/cardapio` e `/privacy` respondem 200.
     *
     * Contra o build de PRODUÇÃO a suíte fechou em 235 passando e 0 falhando
     * em 15/09, este teste incluído. Falta isolar qual requisição fica
     * pendurada a 320 px: a sonda que eu escrevi para isso mediu um servidor
     * que estava devolvendo 404 e não vale.
     */
    test.setTimeout(120_000);

    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(rota, { waitUntil: "load" });

    const m = await mede(page);

    // Sentinela: página vazia não rola para lado nenhum e passaria calada.
    expect(m.altura, `${rota} não tem conteúdo para medir`).toBeGreaterThan(640);

    expect(
      m.rolagem,
      `${rota} rola ${m.rolagem - m.largura}px para o lado a 320 px de largura, ` +
        `o piso da WCAG 1.4.10. Saindo da tela:\n  ${(await culpados(page)).join("\n  ")}`,
    ).toBeLessThanOrEqual(m.largura);
  });

  test(`${rota} não rola para o lado com o texto em 200%`, async ({ page }) => {
    await page.goto(rota, { waitUntil: "load" });

    /*
     * A preferência de tamanho de fonte do navegador muda o corpo do elemento
     * raiz, e todo `rem` da página passa a medir a partir dele — inclusive os
     * recuos horizontais, que por isso COMEM largura útil em vez de sobrar.
     */
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));

    const m = await mede(page);
    expect(m.altura, `${rota} não tem conteúdo para medir`).toBeGreaterThan(400);

    expect(
      m.rolagem,
      `${rota} rola ${m.rolagem - m.largura}px para o lado com o texto em 200% ` +
        `numa tela de ${m.largura}px (WCAG 1.4.4). Saindo da tela:\n  ` +
        `${(await culpados(page)).join("\n  ")}\n` +
        `Causa mais provável: uma grade sem \`grid-cols-1\` — a coluna implícita é ` +
        `\`auto\` e se dimensiona pelo conteúdo, e um \`<input>\` tem largura ` +
        `intrínseca de ~20 caracteres — ou uma palavra longa sem \`break-words\`.`,
    ).toBeLessThanOrEqual(m.largura);
  });
}
