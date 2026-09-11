import { expect, test } from "@playwright/test";

/**
 * Os dois botões do topo da home continuam clicáveis com texto ampliado.
 *
 * **O defeito que isto guarda.** O topo tinha altura FIXA (`h-[34rem]`) e os
 * slides são `absolute inset-0`, então não empurram a caixa: quando o texto
 * cresce, o bloco de conteúdo desce dentro de uma moldura que não acompanha, e
 * encontra a faixa de controles do carrossel — marcadores no rodapé ao centro,
 * pausa e setas no rodapé à direita — que é `z-10` e fica POR CIMA. O botão não
 * desaparece: ele fica atrás de um marcador de 10 px e não responde ao toque.
 * Passando de certo ponto, o bloco sai inteiro da caixa e vai parar sobre a
 * seção seguinte.
 *
 * ⚠️ **Por que ampliar a fonte quebra um layout todo em `rem`.** A primeira
 * intuição é que não deveria: se a altura da caixa também é `rem`, ela cresce
 * junto com o texto e a proporção se mantém. O que não cresce é a **largura da
 * tela**. Com a fonte no dobro, o título de 2,25rem passa a ocupar linhas de
 * 4,5rem numa tela que continua com 412 px — então quebra em mais que o dobro
 * de linhas, e o texto cresce mais rápido que a moldura.
 *
 * **Três invariantes, porque uma só passa verde com a tela quebrada:**
 *
 * 1. **Pilha:** quem recebe o toque no centro do botão é o botão. Medida direta
 *    de operabilidade. `toBeVisible()` responde `true` para um elemento
 *    inteiramente coberto — foi assim que o defeito atravessou a suíte toda.
 * 2. **Transbordo:** o botão termina dentro da caixa do topo. Sem ela, em 200%
 *    a invariante 1 passava *porque* o botão havia descido tanto que já tinha
 *    limpado os marcadores — e o que ele cobria, então, era a seção de baixo.
 * 3. **Sobreposição:** o retângulo do botão não cruza o dos controles. Em 125%
 *    os marcadores entram 24 px dentro do botão e as outras duas passam: o
 *    centro escapa por nove pixels e nada transbordou. O alvo já está mutilado.
 *
 * ⚠️ **As duas medidas têm que sair da MESMA rolagem.** A primeira versão desta
 * guarda lia a caixa antes do `scrollIntoViewIfNeeded()` e o botão depois, e
 * comparava coordenadas de janela tiradas em dois momentos — 175% e 200%
 * passaram com o botão 245 px fora da caixa. Por isso o retângulo do botão, o
 * da caixa e os dos controles vêm de um `evaluate` só.
 *
 * ⚠️ Movimento reduzido congela o primeiro slide. Sem isso a medição pega um
 * carrossel trocando de quadro por baixo dela — a mesma armadilha que deu
 * 1,00:1 numa execução e 11:1 na seguinte na guarda de contraste.
 */

/**
 * WCAG 1.4.4 exige até 200%. 100% é a sentinela: se falhar aí, é outro defeito.
 *
 * ⚠️ **125% e 175% não são enfeite — cada um pega um estado que os outros três
 * não pegam.** Medido no celular antes da correção:
 *
 * | fonte | botão "reservar" | marcadores | caixa acaba em | o que acontece |
 * |---|---|---|---|---|
 * | 100% | 492–544 | 573–597 | 609 | folga de 29 px |
 * | 125% | 675–740 | **716**–746 | 761 | marcadores JÁ dentro do botão |
 * | 150% | 845–923 | 859–895 | 913 | centro do botão coberto |
 * | 175% | 1115–1206 | 1002–1044 | 1065 | o PRIMEIRO botão é o coberto |
 * | 200% | 1358–1462 | 1145–1193 | 1217 | os dois saem inteiros da caixa |
 */
const ESCALAS = [100, 125, 150, 175, 200];

/** O slide que está no ar — os outros têm `aria-hidden` e `pointer-events-none`. */
const ATIVO = '[aria-roledescription="slide"]:not([aria-hidden="true"])';

const BOTOES = [
  { href: "/cardapio", nome: "o botão de ver o cardápio" },
  { href: "/contato", nome: "o botão de reservar" },
];

type Ret = { top: number; bottom: number; left: number; right: number };

const cruza = (a: Ret, b: Ret) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

for (const escala of ESCALAS) {
  test(`os botões do topo respondem ao toque com a fonte em ${escala}%`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    /*
     * É assim que a pessoa amplia o texto: a preferência de tamanho de fonte do
     * navegador muda o corpo do elemento raiz, e todo `rem` da página passa a
     * medir a partir dele. Emular pelo `fontSize` da raiz reproduz exatamente
     * isso, inclusive o crescimento das alturas em `rem` — que é o que torna o
     * defeito não óbvio.
     */
    await page.evaluate((pct) => {
      document.documentElement.style.fontSize = `${(16 * pct) / 100}px`;
    }, escala);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(null))));

    for (const { href, nome } of BOTOES) {
      const botao = page.locator(`${ATIVO} a[href="${href}"]`).first();
      await expect(botao, `${nome} não existe no slide ativo`).toBeAttached();
      await botao.scrollIntoViewIfNeeded();

      // Um `evaluate` só: botão, caixa e controles na mesma rolagem.
      const m = await botao.evaluate((el) => {
        const r = (n: Element | null | undefined): Ret | null => {
          if (!n) return null;
          const b = n.getBoundingClientRect();
          return { top: b.top, bottom: b.bottom, left: b.left, right: b.right };
        };
        const slide = el.closest('[aria-roledescription="slide"]')!;
        const caixa = slide.parentElement!;
        const controles = Array.from(caixa.children)
          .filter((d) => !d.matches('[aria-roledescription="slide"]'))
          .map((d) => ({
            rot: /right-/.test(d.className) ? "as setas" : "os marcadores",
            ret: r(d)!,
          }));
        return { botao: r(el)!, caixa: r(caixa)!, controles };
      });

      // Sentinela: um botão de 0 px passaria as três invariantes sem provar nada.
      expect(m.botao.bottom - m.botao.top, `${nome} tem altura zero`).toBeGreaterThan(20);
      // Sentinela: sem controles achados, a invariante 3 não examinaria nada.
      expect(m.controles.length, "controles do carrossel não encontrados").toBeGreaterThan(0);

      const x = (m.botao.left + m.botao.right) / 2;
      const y = (m.botao.top + m.botao.bottom) / 2;

      const quemResponde = await page.evaluate(
        ({ x, y, href }) => {
          const alvo = document.elementFromPoint(x, y);
          if (!alvo) return "nada (fora da janela)";
          if (alvo.closest(`a[href="${href}"]`)) return "o próprio botão";
          const el = alvo as HTMLElement;
          const classe = String(el.className || "").split(" ")[0];
          return `${el.tagName.toLowerCase()}${classe ? `.${classe}` : ""}`;
        },
        { x, y, href },
      );

      const causa =
        "Causa provável: a altura do topo em src/components/sections/hero-carousel.tsx " +
        "voltou a ser FIXA, ou o recuo que reserva a faixa de controles saiu do " +
        "Container. Com slides em absolute e altura fixa, o que não cabe sai da caixa; " +
        "com a caixa em grade, altura MÍNIMA e recuo simétrico, ela cresce e o conteúdo " +
        "para antes dos controles.";

      expect(
        quemResponde,
        `[pilha] Com a fonte em ${escala}%, ${nome} está no ponto ` +
          `(${Math.round(x)}, ${Math.round(y)}) mas quem recebe o toque ali é ` +
          `"${quemResponde}". ${causa}`,
      ).toBe("o próprio botão");

      expect(
        m.botao.bottom,
        `[transbordo] Com a fonte em ${escala}%, ${nome} termina em ` +
          `${Math.round(m.botao.bottom)}px e a caixa do topo termina em ` +
          `${Math.round(m.caixa.bottom)}px — o conteúdo derramou para fora e está sobre ` +
          `a seção seguinte. ${causa}`,
      ).toBeLessThanOrEqual(m.caixa.bottom + 1);

      const colidindo = m.controles.filter((c) => cruza(m.botao, c.ret));
      expect(
        colidindo.map((c) => c.rot).join(" e "),
        `[sobreposição] Com a fonte em ${escala}%, ${nome} ocupa ` +
          `${Math.round(m.botao.top)}–${Math.round(m.botao.bottom)}px e é cruzado por ` +
          `${colidindo
            .map((c) => `${c.rot} (${Math.round(c.ret.top)}–${Math.round(c.ret.bottom)}px)`)
            .join(" e ")}. O centro pode até escapar, mas parte do alvo está coberta. ` +
          `${causa}`,
      ).toBe("");
    }
  });
}
