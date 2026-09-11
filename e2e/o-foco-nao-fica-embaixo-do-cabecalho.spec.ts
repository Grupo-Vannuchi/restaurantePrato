import { expect, test } from "@playwright/test";

/**
 * O que recebe foco pelo teclado precisa ficar VISÍVEL, não só focado.
 *
 * O cabeçalho é fixo (`sticky top-0 z-50`, 64 px de altura mais a borda). Quando
 * o navegador rola até um elemento focado, ele o alinha ao topo da janela — que
 * é exatamente onde o cabeçalho está. O elemento fica focado, o anel é
 * desenhado, e o cabeçalho está por cima de tudo isso.
 *
 * ⚠️ **O sintoma aparece principalmente ao voltar com Shift+Tab**, e é por isso
 * que passou despercebido: percorrendo para a frente o navegador costuma rolar
 * de modo a deixar o alvo mais abaixo. Voltando, ele encosta no topo. A
 * auditoria de 04/09 mediu 16 paradas completamente cobertas — entre elas o
 * botão "Enviar mensagem" do formulário de contato no celular, com 0 de 25
 * pontos amostrados devolvendo o próprio elemento e 25 de 25 devolvendo algo
 * dentro do `<header>`.
 *
 * É a WCAG 2.4.11 (Foco Não Obscurecido, AA na 2.2): não basta o foco existir,
 * ele precisa não ficar escondido atrás de conteúdo fixo.
 *
 * ⚠️ **Nenhuma guarda existente pegava isto, e vale entender por quê.**
 * `e2e/a11y.spec.ts` verifica que o foco é VISÍVEL no sentido de ter anel
 * desenhado — mede o estilo do elemento, não quem está por cima dele. Um anel
 * perfeito debaixo de um cabeçalho opaco passa nessa medição e falha para quem
 * usa teclado. É a diferença entre o que o CSS declara e o que a tela mostra,
 * a mesma da guarda de contraste sobre foto.
 *
 * O método aqui é `elementFromPoint`: pergunta-se ao navegador quem está no
 * pixel, em vez de confiar em geometria calculada.
 *
 * ⚠️ **O limiar é METADE, e a escolha é do critério, não minha.** A primeira
 * versão desta guarda reprovava qualquer cobertura parcial — que é o nível AAA
 * (2.4.13, Foco Não Obscurecido Ampliado). Rodando assim, ela acusou o botão
 * flutuante do WhatsApp cortando o canto direito dos links do rodapé: 21 de 25
 * pontos visíveis, 84% do elemento e o anel de foco inteiro nos outros três
 * lados. No AA, que é o alvo declarado deste projeto, isso passa — 2.4.11 exige
 * que o elemento não fique INTEIRAMENTE escondido.
 *
 * Deixar o limiar em 100% teria travado a suíte num caso aceitável e treinado
 * quem lê a ignorar. Deixá-lo em "nada visível" deixaria passar um elemento 95%
 * coberto. Metade separa os dois com folga: o defeito real media ZERO de 25.
 */
const ROTAS = ["/", "/cardapio", "/contato"];

for (const rota of ROTAS) {
  test(`${rota}: nada que recebe foco fica escondido atrás do cabeçalho`, async ({
    page,
  }) => {
    await page.goto(rota, { waitUntil: "networkidle" });

    // Percorre para a frente e depois volta: é na volta que o defeito aparece.
    const PASSOS = 25;
    for (let i = 0; i < PASSOS; i++) await page.keyboard.press("Tab");

    const encobertos: string[] = [];
    for (let i = 0; i < PASSOS; i++) {
      await page.keyboard.press("Shift+Tab");
      const r = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const c = el.getBoundingClientRect();
        if (c.width === 0 || c.height === 0) return null;

        // Amostra a caixa numa grade 5×5 e pergunta quem está em cima.
        let proprios = 0;
        let total = 0;
        for (let a = 0; a < 5; a++) {
          for (let b = 0; b < 5; b++) {
            const x = c.left + (c.width * (a + 0.5)) / 5;
            const y = c.top + (c.height * (b + 0.5)) / 5;
            if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
            total += 1;
            const topo = document.elementFromPoint(x, y);
            if (topo && (topo === el || el.contains(topo))) proprios += 1;
          }
        }
        if (total === 0) return null;
        return {
          proprios,
          total,
          /*
           * ⚠️ **`<iframe>` é medido por outro limiar, e o motivo é que a caixa
           * dele não é o que está focado.**
           *
           * O mapa do Google é uma parada de teclado, e o Tab continua ANDANDO
           * dentro dele: os controles de zoom, os links da Google. Visto do
           * documento de fora, `document.activeElement` continua sendo o
           * `<iframe>` em todas essas paradas, e o navegador rola DENTRO do
           * quadro em vez de reposicionar a página — então a caixa do iframe
           * pode ficar parada, com o topo sob o cabeçalho, enquanto o que
           * realmente tem foco é um botão lá dentro cuja posição não é
           * observável daqui.
           *
           * Medido: focando o iframe diretamente, ele fica com 15 de 15 pontos
           * visíveis. Percorrendo por teclado até entrar nele, a mesma caixa
           * aparece com 5 de 15 — quatro vezes, uma por controle interno.
           *
           * Aplicar o limiar de metade a essa caixa acusaria um defeito que não
           * existe. O que ainda dá para exigir, e é exatamente a letra do
           * critério AA 2.4.11, é que ele não fique INTEIRAMENTE escondido.
           *
           * Isto só aparece em build de produção: no servidor de
           * desenvolvimento o mapa não carrega a tempo de virar parada de
           * teclado, e a guarda passava sem nunca ter visto o caso.
           */
          quadro: el.tagName === "IFRAME",
          etiqueta:
            (el.textContent ?? "").trim().slice(0, 34) ||
            el.getAttribute("aria-label") ||
            el.tagName,
        };
      });

      // `null` = nada focado, ou fora da janela: não é o caso que este teste
      // examina, e tratar como falha produziria ruído.
      if (!r) continue;
      const encoberto = r.quadro ? r.proprios === 0 : r.proprios * 2 < r.total;
      if (encoberto) {
        encobertos.push(
          `"${r.etiqueta}" (${r.proprios}/${r.total} pontos visíveis` +
            `${r.quadro ? ", quadro externo: exigido ao menos um" : ""})`,
        );
      }
    }

    expect(
      encobertos,
      `Em ${rota}, ${encobertos.length} parada(s) do teclado ficam sob o cabeçalho fixo:\n  ` +
        `${encobertos.join("\n  ")}\n` +
        "A causa quase certa é 'html' sem 'scroll-padding-top' maior que a altura " +
        "do cabeçalho (64 px + borda). Ver o bloco em src/app/globals.css.",
    ).toEqual([]);
  });
}
