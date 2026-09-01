import { expect, test } from "@playwright/test";

/**
 * Acessibilidade estrutural — o que dá para verificar sem ferramenta externa e
 * que quebra de verdade a navegação de quem não usa mouse.
 *
 * Estes três apontamentos vieram de uma auditoria manual em 20/08/2026 contra
 * o site publicado; virar teste é o que impede a regressão silenciosa. Nenhum
 * deles aparece em `npm run build`, `typecheck` ou `lint`.
 */

/*
 * ⚠️ `/novidades/[slug]` NÃO está nesta lista, e a ausência é documentada de
 * propósito em vez de silenciosa.
 *
 * A página só existe quando há um artigo cadastrado pelo painel, e
 * `generateStaticParams()` devolve `[]` de propósito — nenhum slug é
 * pré-renderizado. Com o banco local vazio (é o estado do Prato hoje: schema
 * aplicado, zero conteúdo), qualquer slug responde 404, e um teste que visita
 * uma página inexistente passa sem verificar nada.
 *
 * O que era verificável ali virou teste unitário determinístico:
 * `test/titulo-do-artigo-nao-pula-nivel.test.tsx` cobre o risco de salto de
 * nível vindo do texto que o cliente digita. Quando houver conteúdo real, esta
 * lista ganha a rota.
 */
const PAGES = [
  "/",
  "/cardapio",
  "/experiencia",
  "/galeria",
  "/reservas",
  "/contato",
  "/novidades",
];

for (const path of PAGES) {
  test(`${path} deixa pular o menu com o teclado`, async ({ page }) => {
    // Critério WCAG 2.4.1 (nível A). Sem isto, quem navega por teclado passa
    // pelos links do cabeçalho inteiro em toda página antes de chegar ao texto.
    await page.goto(path);
    await page.keyboard.press("Tab");

    const focado = page.locator(":focus");
    await expect(focado).toHaveAttribute("href", "#conteudo");
    // Escondido para quem enxerga, visível assim que recebe foco: um link que
    // ninguém vê nem com Tab não ajuda ninguém.
    await expect(focado).toBeVisible();

    await focado.press("Enter");
    await expect(page.locator("main#conteudo")).toBeVisible();
  });

  test(`${path} não pula nível de título`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });

    const saltos = await page.evaluate(() => {
      const níveis = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({
        nível: Number(h.tagName[1]),
        texto: (h.textContent ?? "").trim().slice(0, 40),
      }));
      const encontrados: string[] = [];
      for (let i = 1; i < níveis.length; i++) {
        if (níveis[i].nível - níveis[i - 1].nível > 1) {
          encontrados.push(
            `h${níveis[i - 1].nível} ("${níveis[i - 1].texto}") → h${níveis[i].nível} ("${níveis[i].texto}")`,
          );
        }
      }
      return encontrados;
    });

    // Um salto de h1 para h3 faz o leitor de tela anunciar um nível que não
    // existe na página. Nas páginas ainda sem conteúdo — galeria e novidades —
    // não há `h2` nenhum, então o `h3` do rodapé ficava logo abaixo do título.
    expect(saltos, saltos.join(" | ")).toEqual([]);
  });

  test(`${path} descreve toda imagem`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const semAlt = await page.evaluate(
      () =>
        [...document.querySelectorAll("img")].filter((img) => !img.hasAttribute("alt"))
          .length,
    );
    expect(semAlt).toBe(0);
  });
}

test("o foco do teclado fica visível ao percorrer a página", async ({ page }) => {
  // `globals.css` desenha um contorno em `:focus-visible`. Uma
  // classe `focus-visible:outline-none` num componente apaga essa regra — e foi
  // o que aconteceu com o botão do site inteiro: o foco existia, invisível.
  // Critério WCAG 2.4.7, nível AA.
  await page.goto("/reservas");

  // 30 paradas: o suficiente para atravessar o cabeçalho inteiro e alcançar
  // os botões do corpo da página, que é onde o defeito estava.
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");

    const contorno = await page.evaluate(() => {
      const alvo = document.activeElement;
      if (!alvo || alvo === document.body) return null;
      const estilo = getComputedStyle(alvo);
      return {
        tag: alvo.tagName,
        largura: parseFloat(estilo.outlineWidth) || 0,
        estiloContorno: estilo.outlineStyle,
        sombra: estilo.boxShadow,
      };
    });

    if (!contorno) continue;

    // O `<iframe>` do mapa fica de fora, e não por conveniência: quando o Tab
    // entra num quadro embutido, o foco passa para o documento de dentro. O
    // indicador visível ali é responsabilidade de quem serve aquele documento
    // — o Google —, e a página de fora não tem como desenhá-lo. Exigir
    // contorno no elemento `<iframe>` é exigir o impossível.
    if (contorno.tag === "IFRAME") continue;

    // O overlay de erro do `next dev` (`<nextjs-portal>`) entra na ordem de
    // tabulação e não tem contorno. Não é o site: em produção ele não existe.
    // Sem esta isenção a suíte só passa contra um build, o que na prática
    // significava não rodá-la localmente.
    if (contorno.tag === "NEXTJS-PORTAL") continue;

    const temContorno = contorno.largura > 0 && contorno.estiloContorno !== "none";
    const temSombra = contorno.sombra !== "none" && contorno.sombra !== "";
    expect(
      temContorno || temSombra,
      `<${contorno.tag}> recebeu foco sem indicação visível`,
    ).toBe(true);
  }
});

/**
 * Menu suspenso: abre no mouse, tem que abrir no teclado.
 *
 * O painel é CSS puro — nasce `invisible` e o `hover` o revela. Quem navega por
 * teclado nunca dispara `hover`, e `visibility: hidden` também tira os links de
 * dentro da ordem de tabulação: para essa pessoa o menu não existe.
 *
 * O que denuncia que era defeito, e não decisão: o gatilho já carregava
 * `group-focus-within:text-foreground`. Alguém pensou no foco de teclado,
 * mudou a cor do gatilho e esqueceu o painel.
 *
 * Aqui vai o hambúrguer de novidades, que está em toda página. O menu de
 * `gastronomia` usa o mesmo mecanismo mas só é renderizado quando existem
 * categorias de cardápio — enquanto não existirem, quem o cobre é
 * `test/keyboard-dropdowns.test.ts`, que lê a fonte em vez do resultado.
 */
test("o menu de novidades abre com o foco do teclado, não só no hover", async ({
  page,
  isMobile,
}) => {
  // O menu suspenso é `hidden md:flex`: no celular ele não existe, e lá a
  // navegação inteira vive no painel do hambúrguer, coberta por
  // `e2e/menu-do-celular.spec.ts`. A isenção nasceu junto com o projeto
  // `celular` do `playwright.config.ts`.
  test.skip(isMobile, "o menu suspenso só existe a partir do breakpoint md");
  await page.goto("/");

  // Localizado pelo destino, e não pelo rótulo: o rótulo é copy e mudou em
  // 27/08 ("Abrir novidades" prometia um comportamento que um `<a href>` não
  // tem). Um teste de estrutura não deve quebrar quando a copy muda.
  const grupo = page
    .locator("header div.group")
    .filter({ has: page.locator('a[href="/novidades"]') });
  const gatilho = grupo.locator('a[href="/novidades"]');
  const painel = grupo.locator(":scope > div");

  // Fechado antes de qualquer interação — senão o teste passaria mesmo com o
  // painel permanentemente aberto, que é outro defeito.
  await expect(painel).toBeHidden();

  await gatilho.focus();
  await expect(painel).toBeVisible();
});
