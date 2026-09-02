import { expect, test } from "@playwright/test";

/**
 * O anel de foco precisa ser VISÍVEL, não apenas existir.
 *
 * `e2e/a11y.spec.ts` já cobra que o contorno exista (`outlineWidth > 0`), e
 * essa checagem passava verde com o defeito no ar: `globals.css` desenhava o
 * contorno em `--color-brand`, e o cartão de fechamento pinta o fundo com essa
 * mesma cor. Contorno da marca sobre a marca dá **1,00:1** — o contorno existe
 * e ninguém enxerga onde está.
 *
 * Além disso, o único teste de foco visitava `/reservas`, que é a única página
 * de marketing SEM o cartão. Medir o que é fácil de medir, na página onde o
 * defeito não mora.
 *
 * Critério WCAG 1.4.11 (nível AA): um indicador de foco é elemento gráfico e
 * precisa de 3:1 contra o que está atrás dele.
 */

// `/cardapio` fica de fora: ela não tem o cartão de fechamento na cor da
// marca, que é o que este teste mede.
const PAGINAS = ["/", "/experiencia"];
const MINIMO = 3;

function luminancia([r, g, b]: number[]): number {
  const [R, G, B] = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function razao(a: number[], b: number[]): number {
  const [l1, l2] = [luminancia(a), luminancia(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** "rgb(96, 120, 39)" / "rgba(255, 255, 255, 0.4)" → [r,g,b] já achatado no fundo. */
function achatar(cor: string, fundo: number[]): number[] | null {
  const n = cor.match(/[\d.]+/g)?.map(Number);
  if (!n || n.length < 3) return null;
  const alfa = n.length > 3 ? n[3] : 1;
  if (alfa === 0) return null;
  return [0, 1, 2].map((i) => Math.round(n[i] * alfa + fundo[i] * (1 - alfa)));
}

for (const caminho of PAGINAS) {
  test(`${caminho}: o foco é visível dentro do cartão da marca`, async ({ page }) => {
    await page.goto(caminho, { waitUntil: "networkidle" });

    const resultado = await page.evaluate(async () => {
      // O cartão é o elemento cuja cor de fundo é a da marca.
      const marca = getComputedStyle(document.documentElement)
        .getPropertyValue("--color-brand")
        .trim();
      const sonda = document.createElement("div");
      sonda.style.backgroundColor = marca;
      document.body.append(sonda);
      const marcaRgb = getComputedStyle(sonda).backgroundColor;
      sonda.remove();

      // Há mais de um elemento na cor da marca (a bolinha do eyebrow, por
      // exemplo). O cartão é o que de fato contém controles focáveis.
      const candidatos = [...document.querySelectorAll<HTMLElement>("section *")]
        .filter((el) => getComputedStyle(el).backgroundColor === marcaRgb)
        .map((el) => ({
          el,
          controles: [
            ...el.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
          ],
        }))
        .filter((c) => c.controles.length > 0);

      if (candidatos.length === 0) {
        return { erro: "nenhuma superfície na cor da marca com controle focável" };
      }
      // O mais interno: se houver aninhamento, é o que está imediatamente atrás.
      const cartao = candidatos[candidatos.length - 1];
      const controles = cartao.controles;

      // ⚠️ Esperar a transição assentar não é zelo: `transition-colors` do
      // Tailwind inclui `outline-color`, então a cor lida logo após o
      // `.focus()` ainda é a inicial (`currentColor`) — e `currentColor` no
      // cartão é branco ou quase preto, que passam. A primeira versão deste
      // teste passava verde com o defeito no ar exatamente por isso.
      const assentar = async (alvo: HTMLElement) => {
        alvo.focus();
        await Promise.race([
          Promise.all(alvo.getAnimations().map((a) => a.finished.catch(() => {}))),
          new Promise((r) => setTimeout(r, 800)),
        ]);
      };

      const medidas: {
        nome: string;
        fundoAtras: string;
        contorno: string | null;
        sombra: string;
      }[] = [];
      for (const alvo of controles) {
        await assentar(alvo);
        const estilo = getComputedStyle(alvo);
        medidas.push({
          nome: (alvo.textContent ?? alvo.tagName).trim().slice(0, 30),
          fundoAtras: marcaRgb,
          contorno:
            estilo.outlineStyle !== "none" && parseFloat(estilo.outlineWidth) > 0
              ? estilo.outlineColor
              : null,
          sombra: estilo.boxShadow,
        });
      }

      return { medidas };
    });

    expect(resultado.erro, resultado.erro).toBeUndefined();
    // Sentinela: se o cartão sumir da página, o teste passaria vazio.
    expect(resultado.medidas!.length).toBeGreaterThan(0);

    for (const m of resultado.medidas!) {
      const fundo = achatar(m.fundoAtras, [255, 255, 255])!;

      // Todas as cores que o navegador desenha como indicador — contorno e
      // cada camada de box-shadow. Basta UMA alcançar 3:1 para a pessoa ver.
      const cores: string[] = [];
      if (m.contorno) cores.push(m.contorno);
      if (m.sombra && m.sombra !== "none") {
        cores.push(...(m.sombra.match(/rgba?\([^)]+\)/g) ?? []));
      }

      const razoes = cores
        .map((c) => achatar(c, fundo))
        .filter((c): c is number[] => c !== null)
        .map((c) => razao(c, fundo));

      const melhor = razoes.length ? Math.max(...razoes) : 0;

      expect(
        melhor,
        `"${m.nome}": melhor indicador de foco dá ${melhor.toFixed(2)}:1 contra o cartão ` +
          `(mínimo ${MINIMO}:1). Cores medidas: ${cores.join(" , ") || "nenhuma"}`,
      ).toBeGreaterThanOrEqual(MINIMO);
    }
  });
}
