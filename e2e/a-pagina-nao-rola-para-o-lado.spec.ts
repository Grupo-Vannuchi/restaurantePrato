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
     * ⚠️ **NÃO espere `load` aqui, e a razão foi isolada em 17/09 depois de
     * dois dias de hipótese errada.**
     *
     * Este teste mede LARGURA — `scrollWidth <= clientWidth`, o piso da WCAG
     * 1.4.10. Com `waitUntil: "load"` ele reprovava em `/cardapio` sem nunca
     * chegar à asserção: o `goto` estourava 120 s com a página RENDERIZADA na
     * captura de tela. Não era lentidão, e não era rolagem lateral.
     *
     * ── O que estava pendurado ────────────────────────────────────────────
     *
     * A 320 px num Pixel 7 (densidade 2,625) o navegador pede o balde de
     * **1080** para a foto de topo do cardápio, e essa requisição não volta:
     *
     *   /_next/image?url=/hero/churrasco-na-brasa.webp&w=1080&q=50
     *
     * Medido: travada depois de 120 s, enquanto 640, 750, 828, 1200 e 1920 da
     * MESMA imagem voltam em milissegundos, uma largura genuinamente fria
     * (w=384) volta em 27 ms, e o `sharp` sozinho faz exatamente essa conversão
     * em 0,11 s. Encoder são, geração a frio sã, uma chave travada.
     *
     * A 412 px — a largura padrão do aparelho — a mesma página dispara `load`
     * sem nenhuma pendente. Só a 320 px, porque é a única medição deste
     * repositório que sorteia aquele balde.
     *
     * ── Por que é o processo, e não o disco ───────────────────────────────
     *
     * Reiniciando o servidor SEM apagar `.next`, a mesma URL volta em 0,30 s.
     * O estado ruim é em MEMÓRIA: uma otimização em voo abortada — e a suíte
     * abre e fecha páginas o tempo todo — deixa a entrada pendurada no mapa de
     * deduplicação do otimizador, e toda requisição seguinte da mesma chave
     * espera por ela para sempre. É `priority` na foto de topo, então o `load`
     * da página inteira fica preso atrás disso.
     *
     * ⚠️ **E isso corrige o diagnóstico de 15/09.** Naquele dia o mesmo sintoma
     * foi atribuído ao AVIF, e o AVIF saiu do `next.config.ts` por causa dele.
     * O travamento NÃO é do AVIF: reproduz no caminho WebP, com o AVIF
     * desligado. O que muda é a chave, não o formato.
     *
     * Esperar `domcontentloaded` mais as fontes é o que este teste de fato
     * precisa: layout estável, que é o que ele mede. Quem mede tempo é
     * `performance.spec.ts`, com orçamento próprio e mensagem própria.
     */
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(rota, { waitUntil: "domcontentloaded" });
    // As fontes mudam a largura do texto, e é largura que se mede aqui.
    await page.evaluate(() => document.fonts.ready);

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
