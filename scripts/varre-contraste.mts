/**
 * Varredura de contraste no COMPOSTO RENDERIZADO, em toda a página.
 *
 * Não mede o token declarado: esconde o texto, fotografa, e amostra a cor que
 * sobra sob cada elemento. É a única forma de pegar texto que cai sobre foto,
 * gradiente ou forma decorativa — casos em que o valor do token não diz nada
 * sobre o que a pessoa vê.
 *
 * ⚠️ **Por que ela existe se já há guardas de contraste.** As de `e2e/` medem
 * superfícies que alguém JÁ SABIA que existiam: as cinco aberturas com foto, o
 * cartão de fechamento, o selo do dia. Todas nasceram de auditoria manual. Esta
 * varre todo elemento de texto de toda rota, em três larguras, e é por isso que
 * ela acha o que ninguém pensou em olhar. As duas coisas não se substituem: a
 * varredura descobre, as guardas impedem a volta.
 *
 * Adaptada da varredura que o projeto irmão pôs no repositório em 14/09. As
 * quatro defesas abaixo são de lá — cada uma custou horas a alguém — e as
 * diferenças estão marcadas.
 *
 * ⚠️ **São quatro aqui e seis no total.** A quinta e a sexta armadilha foram
 * descobertas neste repositório e o projeto irmão ainda tem as duas: a **cor em
 * `oklab()`** lida por expressão regular (no `resolveCor`, quinze reprovas
 * fantasmas) e a **sombra de sobreposto fixo** (na grade, uma reprova que não
 * existia). Uma sétima defesa foi tentada e desfeita — está na amostragem, para
 * ninguém reinventá-la.
 *
 * Uso, com um build de produção no ar:
 *
 *   npx tsx scripts/varre-contraste.mts /cardapio,/
 *   BASE_URL=http://localhost:3200 npx tsx scripts/varre-contraste.mts
 *
 * Sai com código 1 se houver qualquer reprova, para servir de porta em CI.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  As quatro armadilhas herdadas, e a defesa de cada uma
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Número errado e evidente a gente descarta; o perigo é o número errado e
 * CRÍVEL — ele manda procurar o defeito no lugar errado, e às vezes aprova a
 * tela quebrada.
 *
 * **1. Amostrar um ponto que não é do elemento medido.** Sem confirmar a quem o
 * pixel pertence, a varredura compara a cor do texto com o que estiver por cima
 * ou ao lado — um cartão vizinho, um botão flutuante, o próprio glifo. No
 * projeto irmão isso rendeu dezenas de reprovas falsas e escondeu a única
 * verdadeira. Defesa: `elementFromPoint` confirma o dono do ponto.
 *
 * **2. Descongelar a animação acendendo a decoração junto.** Forçar
 * `opacity: 1` em tudo evita fotografar a entrada suave no meio — e acende a
 * decoração de fundo, que usa opacidade baixa de PROPÓSITO, medindo uma tela
 * que não existe. No projeto irmão rendeu 123 reprovas fantasmas. Defesa: só
 * descongela o que não é `aria-hidden`.
 *
 * ⚠️ Aqui há uma defesa a mais, que lá não é necessária: `reducedMotion:
 * "reduce"` também **congela o carrossel do topo**, que troca de slide a cada
 * seis segundos. Sem isso a medição sai de um quadro que já não existe — deu
 * 1,00:1 numa execução e 11:1 na seguinte, com o mesmo código, na guarda de
 * `e2e/o-texto-sobre-a-foto-continua-legivel.spec.ts`.
 *
 * **3. Medir com o layout ainda se mexendo.** As fotos são `lazy`: medindo os
 * retângulos antes de elas carregarem, o layout desloca entre a medição e a
 * captura e os pontos caem noutro lugar. Defesa: esperar `img.complete`.
 *
 * **4. O cache de imagem do Next.** Trocar um arquivo em `public/` não invalida
 * as versões otimizadas, e cada largura do `srcset` é uma entrada diferente —
 * conferir uma só não prova nada.
 *
 * ⚠️ **E aqui a instrução é diferente da do projeto irmão, que manda apagar o
 * cache com o servidor no ar.** NÃO faça isso: o otimizador mantém estado sobre
 * aquele diretório, e removê-lo embaixo de um `next start` vivo faz certas
 * conversões bloquearem para sempre — sem resposta, sem erro, sem log. Custou
 * uma tarde de 14/09 e dezesseis testes de celular. A ordem é **parar, apagar,
 * subir**. Está no `AGENTS.md`.
 */
/*
 * ⚠️ O `chromium` vem de `@playwright/test`, que é dependência DIRETA deste
 * projeto. O pacote `playwright` existe aqui só de forma transitiva, e importar
 * dependência transitiva é depender de um detalhe da árvore de alguém.
 *
 * É também a diferença que dispensa a pendência declarada no topo da varredura
 * do projeto irmão: lá o Playwright não é dependência, e o caminho dela aponta
 * para o `node_modules` DESTE repositório — o que faz aquele script rodar só
 * nesta máquina. Aqui ele roda em qualquer clone.
 */
import { chromium } from "@playwright/test";

/*
 * A fórmula da WCAG vem de `e2e/contraste.ts`, e não copiada para cá. Este
 * repositório já pagou por duas cópias da mesma conta: quando divergem, uma das
 * medições passa a afirmar um número que ninguém conferiu. É também por isso
 * que este arquivo é `.mts` rodado por `tsx`, e não `.mjs` — para poder importar
 * o módulo que já existe em vez de trazer uma terceira cópia.
 */
import { contraste, luminancia } from "../e2e/contraste";

/** Mínimo da WCAG 1.4.3 para texto normal. */
const MINIMO = 4.5;

/**
 * As três larguras. 390 é o celular pequeno, e é onde quase todo defeito de
 * contraste deste projeto apareceu primeiro — o véu do topo media 4,68:1 no
 * desktop e 1,20:1 ali.
 */
const LARGURAS: [string, number, number][] = [
  ["desktop", 1920, 950],
  ["laptop", 1440, 900],
  ["celular", 390, 844],
];

/** As sete rotas públicas. */
const ROTAS_PADRAO = [
  "/",
  "/experiencia",
  "/cardapio",
  "/galeria",
  "/reservas",
  "/contato",
  "/novidades",
];

/**
 * ⚠️ **A cor do texto é resolvida PELO NAVEGADOR, e não por expressão regular.
 * Esta é a quinta armadilha, e ela produziu quinze reprovas fantasmas.**
 *
 * A varredura do projeto irmão lê `getComputedStyle(el).color` e extrai os três
 * primeiros números com `/\d+/g`, o que só funciona para `rgb()` e `rgba()`.
 * O Tailwind v4 emite **`oklab()`** para qualquer cor com modificador de
 * opacidade: a ressalva do cardápio, que é `text-background/70`, computa como
 *
 *   oklab(0.999994 0.0000455677 0.0000200868 / 0.7)
 *
 * e a expressão devolvia `rgb(1, 0, 0)` — quase preto. Branco a 70% sobre véu
 * escuro, que se lê sem esforço, apareceu como 1,10:1 em quinze medições
 * espalhadas por três larguras. Número absurdo? Não: 1,10 é plausível para
 * texto escuro sobre fundo escuro, e foi por isso que eu fui investigar o
 * componente antes de desconfiar do medidor.
 *
 * Pintar a cor num canvas e ler o pixel resolve QUALQUER formato — `oklab`,
 * `color()`, `hsl`, `rgb` — e devolve o alfa de graça. O alfa importa: ele é a
 * diferença entre a cor declarada e a tinta que chega à tela.
 */
const resolveCor = `(cor) => {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2], d[3] / 255];
}`;

const rotas = (process.argv[2] ?? ROTAS_PADRAO.join(",")).split(",").filter(Boolean);
const base = process.env.BASE_URL ?? "http://localhost:3200";

const navegador = await chromium.launch();
let reprovas = 0;
const achados: string[] = [];

for (const rota of rotas) {
  for (const [nome, largura, altura] of LARGURAS) {
    const pagina = await navegador.newPage({
      viewport: { width: largura, height: altura },
      // Armadilha 2, segunda metade: congela o carrossel do topo.
      reducedMotion: "reduce",
    });

    try {
      await pagina.goto(`${base}${rota}`, { waitUntil: "load", timeout: 60_000 });
    } catch {
      /*
       * ⚠️ **Rota que não carrega é REPROVA, não "pulada".**
       *
       * Isto dizia "rota pulada" e seguia em frente, e em 18/09 a varredura
       * imprimiu as três larguras de `/cardapio` puladas e fechou com
       * "✅ 0 reprovas" — com o servidor fora do ar por um erro de build. Uma
       * ferramenta que aprova quando o site não responde não é porta de CI; é
       * carimbo.
       *
       * Segunda vez que este arquivo aprova sem medir, e a outra está na
       * sentinela de amostras mais abaixo. As duas são a mesma lição: só existe
       * "0 reprovas" depois de existir medição.
       */
      reprovas++;
      const linha = `  ❌ ${rota} ${nome}: a página não carregou`;
      console.log(linha);
      achados.push(linha.trim());
      await pagina.close();
      continue;
    }

    // Armadilha 2: descongela só o CONTEÚDO. Decoração é `aria-hidden` neste
    // projeto e mantém a opacidade que o desenho lhe deu.
    await pagina.addStyleTag({
      content: `
        *,*::before,*::after { animation: none !important; transition: none !important }
        *:not([aria-hidden="true"]):not([aria-hidden="true"] *) { opacity: 1 !important }
      `,
    });
    await pagina.waitForTimeout(400);

    const alturaTotal = await pagina.evaluate(() => document.body.scrollHeight);
    let amostras = 0;
    let pior = { r: 99, txt: "" };
    const vistos = new Set<string>();

    for (let y = 0; y < Math.max(alturaTotal - altura * 0.15, 1); y += Math.floor(altura * 0.75)) {
      await pagina.evaluate((yy) => window.scrollTo(0, yy), y);

      /*
       * Armadilha 3: espera o layout parar de se mexer.
       *
       * ⚠️ **Só as imagens EM VISTA, e é isso que faz a varredura terminar.** A
       * forma original espera `img.complete` em TODAS. Em `/cardapio` o
       * carrossel de massas deixa foto tardia fora da tela que nunca completa —
       * nada a trouxe para a vista, que é o comportamento correto do
       * carregamento tardio —, então a espera estourava o tempo em CADA passo de
       * rolagem. Medido: treze passos vezes três larguras vezes quinze segundos,
       * e a rota sozinha passava de nove minutos.
       *
       * Imagem fora da tela também não tem como deslocar o que está sendo
       * medido, então esperar por ela nunca foi a pergunta certa. O teto caiu
       * para 3 s porque agora ele é folga, não a regra.
       */
      await pagina
        .waitForFunction(
          () =>
            [...document.images]
              .filter((i) => {
                const r = i.getBoundingClientRect();
                return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
              })
              .every((i) => i.complete),
          null,
          { timeout: 3_000 },
        )
        .catch(() => {});
      await pagina.waitForTimeout(250);

      /*
       * ⚠️ **A varredura pergunta ao PIXEL de quem ele é, e não a cada elemento
       * onde ele está. A inversão é o que a fez terminar.**
       *
       * A forma original — a do projeto irmão — itera os elementos de texto e,
       * para cada um, pede o retângulo e cinco pontos. O custo é proporcional ao
       * TAMANHO DA PÁGINA, e `/cardapio` tem 410 linhas de prato: cinco painéis
       * de dia, todos no DOM porque o padrão `tablist` exige. Cada
       * `getBoundingClientRect()` força recálculo de layout numa página de
       * milhares de pixels. Medido: aquela rota sozinha passava de cinco
       * minutos, e a varredura completa não terminava em dez.
       *
       * Aqui a grade tem custo CONSTANTE por tela: um `elementFromPoint` por
       * ponto, e o dono responde quem é. Isso também resolve de graça a
       * armadilha 1 — não existe "ponto que não é do elemento medido", porque o
       * elemento é definido PELO ponto.
       *
       * E amostra o que o olho encontra: uma grade uniforme não dá mais peso a
       * um parágrafo curto que a um título grande, como cinco pontos por
       * elemento davam.
       */
      const alvos = await pagina.evaluate((fonteDoResolvedor) => {
        const resolve = eval(fonteDoResolvedor) as (
          cor: string,
        ) => [number, number, number, number];
        const PASSO_X = 16;
        const PASSO_Y = 14;
        const MAX_POR_ELEMENTO = 5;

        /*
         * ⚠️ **A sexta armadilha: a SOMBRA de um sobreposto fixo escurece o
         * fundo sem aparecer no `elementFromPoint`. Rendeu a única reprova que
         * sobrou da varredura, e ela não existia.**
         *
         * O preço de uma sobremesa reprovou com 4,32:1 sobre rgb(238,239,235),
         * a 0,18 do mínimo — plausível o bastante para me fazer procurar uma
         * superfície com tinta de 5% que não existe em lugar nenhum do projeto.
         * A pilha declarada é `text-brand` sobre `bg-card`: 4,80:1, passa.
         *
         * O ponto era (340, 830) numa tela de 390×844 — canto inferior
         * direito, onde vive o botão do WhatsApp, `fixed bottom-5 right-5` de
         * 56 px. A caixa dele termina em y=824, e o ponto está 6 px ABAIXO
         * dela: o que escurece ali é a `shadow-lg`, `0 10px 15px -3px`, cuja
         * penumbra alcança y≈849. Sombra não é alvo de teste de acerto, então
         * `elementFromPoint` respondeu o parágrafo do preço, e a varredura
         * compôs a tinta LIMPA sobre um fundo já sombreado.
         *
         * Esse é o erro, e ele é de aritmética, não de desenho: na tela a
         * sombra cai sobre a letra E sobre o fundo, e o contraste entre os dois
         * quase não muda. Medir só o fundo escurecido inventa uma diferença.
         *
         * A defesa é geométrica e substitui o `WHATSAPP` que havia aqui —
         * aquele comparava o pixel com o verde da marca, o que pegava a TINTA
         * do botão e nunca a sombra dele. Esta veta a região, e vale para o
         * próximo sobreposto que alguém acrescentar sem avisar.
         *
         * ⚠️ **O ponto cego que ela abre, e por que ele é aceitável.** Texto que
         * viva DENTRO de um sobreposto fixo deixa de ser medido, porque a caixa
         * dele é vetada em toda tela. Hoje o único sobreposto fixo é o botão do
         * WhatsApp, que não tem texto visível — só `aria-label` e ícone. Se um
         * dia entrar aviso de cookie ou barra de CTA fixa, ela precisa de guarda
         * própria em `e2e/`, porque esta varredura não vai vê-la. Conteúdo
         * normal não corre esse risco: a região vetada é relativa à TELA, e o
         * passo de rolagem é de 75% da altura, então o que cai no canto num
         * passo aparece no meio do seguinte.
         *
         * Verificado nos dois sentidos em 15/09: com o veto, `/cardapio` fecha
         * em 0 reprovas e 1.000 amostras no celular — 15 pontos a menos que as
         * 1.015 de antes, que é o tamanho da região. E com o verde da marca
         * trocado por um #8AA84E de propósito, a varredura reprova 48 vezes a
         * 2,59:1, inclusive no MESMO preço que dava o fantasma.
         *
         * ⚠️ `sticky` fica FORA da lista de propósito. O cabeçalho é sticky,
         * opaco e de 65 px: ponto embaixo dele já é descartado porque
         * `elementFromPoint` responde um elemento do cabeçalho, que não está em
         * `main` nem em `footer`. Vetar a caixa dele cegaria a faixa superior
         * de toda tela em troca de nada.
         */
        const vetados: { l: number; t: number; r: number; b: number }[] = [];
        for (const el of document.querySelectorAll("body *")) {
          const s = getComputedStyle(el);
          if (s.position !== "fixed") continue;
          /*
           * ⚠️ **Só o que está POR CIMA, e esta linha nasceu de a varredura
           * devolver "0 amostras · ✅ 0 reprovas" numa página inteira.**
           *
           * Em 18/09 o cardápio ganhou um fundo `fixed inset-0 -z-10`, que
           * cobre a tela toda por TRÁS do conteúdo. O veto acima foi escrito
           * para sobreposto — o botão do WhatsApp e a sombra dele — e não
           * distinguia os dois: vetou cada ponto da grade, e a varredura passou
           * verde sem medir um pixel.
           *
           * `z-index` negativo é o que diz "fica atrás do conteúdo". Um fundo
           * assim não pode cobrir texto nenhum, então ele não tem por que vetar
           * nada — pelo contrário, ele é exatamente a superfície que esta
           * varredura existe para medir.
           */
          const camada = Number.parseInt(s.zIndex, 10);
          if (Number.isFinite(camada) && camada < 0) continue;
          const cx = el.getBoundingClientRect();
          if (cx.width === 0 || cx.height === 0) continue;
          let dx = 0;
          let dy = 0;
          // `box-shadow` vem como "<cor> x y desfoque espalhamento" por camada.
          // A cor sai primeiro para as vírgulas restantes separarem só camadas.
          for (const camada of s.boxShadow.replace(/rgba?\([^)]*\)/g, "").split(",")) {
            const n = camada.match(/-?[\d.]+/g);
            if (!n) continue;
            const v = [0, 1, 2, 3].map((i) => parseFloat(n[i] ?? "0") || 0);
            // Espalhamento negativo encolhe, mas entra em módulo: vetar 3 px a
            // mais não custa nada e nunca subestimar a penumbra é o que importa.
            dx = Math.max(dx, Math.abs(v[0]!) + v[2]! + Math.abs(v[3]!));
            dy = Math.max(dy, Math.abs(v[1]!) + v[2]! + Math.abs(v[3]!));
          }
          vetados.push({
            l: cx.left - dx,
            t: cx.top - dy,
            r: cx.right + dx,
            b: cx.bottom + dy,
          });
        }

        const porElemento = new Map<
          Element,
          { txt: string; cor: [number, number, number, number]; pontos: [number, number][] }
        >();

        for (let y = 4; y < window.innerHeight - 4; y += PASSO_Y) {
          for (let x = 4; x < window.innerWidth - 4; x += PASSO_X) {
            // Sexta armadilha: dentro de sobreposto fixo ou da sombra dele, o
            // pixel não é o fundo da letra. Antes do `elementFromPoint` porque
            // é a checagem mais barata das duas.
            if (vetados.some((v) => x >= v.l && x <= v.r && y >= v.t && y <= v.b)) {
              continue;
            }
            const dono = document.elementFromPoint(x, y);
            if (!dono) continue;
            /*
             * ⚠️ **Margem de 3 px da borda do elemento, e isso é a armadilha 1
             * numa variante que a grade NÃO resolve de graça.**
             *
             * `elementFromPoint` responde pela caixa de acerto, que segue o
             * `border-radius` mas não garante que o elemento PINTE ali. Num selo
             * `rounded-full`, o ponto perto do canto pertence ao selo e mostra a
             * cor da aba atrás dele: o selo "Hoje", que mede 4,98:1 de verdade,
             * apareceu como 1,00:1 sobre o verde da marca. O mesmo tipo de falso
             * positivo me custou uma rodada em 14/09, na guarda do selo, e a
             * defesa lá foi recortar só onde há letra.
             */
            const cx = dono.getBoundingClientRect();
            if (
              x - cx.left < 3 ||
              cx.right - x < 3 ||
              y - cx.top < 3 ||
              cx.bottom - y < 3
            ) {
              continue;
            }
            /*
             * ⚠️ **E a margem tem de conhecer o RAIO, não só a caixa** — a
             * margem de 3 px acima é medida da caixa de acerto, que é
             * retangular mesmo quando o elemento é uma pílula.
             *
             * Em 18/09 isso rendeu duas reprovas nas abas de dia do cardápio:
             * "Segunda" a 3,14:1 sobre rgb(168,179,145) e "Quinta" a 1,17:1
             * sobre o verde puro. O par declarado da aba é
             * `muted-foreground` sobre `card`, que mede **6,65:1** e passa — o
             * ponto tinha caído no canto da pílula `rounded-full`, fora do que
             * ela pinta, num pixel de borda antisserrilhada ou já no fundo.
             *
             * Só apareceu na largura de laptop, porque é onde a grade de 16 px
             * calha de cair nos cantos: defeito de medição que se disfarça de
             * defeito de layout dependente de tela.
             *
             * O teste abaixo é a contenção exata num retângulo arredondado: no
             * quadrante de cada canto, o ponto tem de estar dentro do círculo
             * de raio `r`. `border-radius` em porcentagem ou com dois valores
             * não é tratado — cai no caminho de cima e segue com a margem
             * reta, que é o comportamento conservador.
             */
            const raioBruto = Number.parseFloat(getComputedStyle(dono).borderRadius);
            if (Number.isFinite(raioBruto) && raioBruto > 3) {
              const r = Math.min(raioBruto, cx.width / 2, cx.height / 2);
              const dx = Math.max(cx.left + r - x, x - (cx.right - r), 0);
              const dy = Math.max(cx.top + r - y, y - (cx.bottom - r), 0);
              // Fora do círculo do canto, ou a menos de 3 px da curva dele.
              if (dx > 0 && dy > 0 && Math.hypot(dx, dy) > r - 3) continue;
            }
            // Só FOLHAS com texto: um contêiner "contém" o texto dos filhos, e
            // medir a cor dele contra a foto que ele embrulha não diz nada.
            if (dono.children.length > 0) continue;
            const texto = dono.textContent?.trim();
            if (!texto || texto.length < 3) continue;
            // Fora de `main` e `footer` não é conteúdo desta varredura.
            if (!dono.closest("main") && !dono.closest("footer")) continue;

            const ja = porElemento.get(dono);
            if (ja) {
              if (ja.pontos.length < MAX_POR_ELEMENTO) ja.pontos.push([x, y]);
              continue;
            }
            porElemento.set(dono, {
              txt: texto.slice(0, 44),
              cor: resolve(getComputedStyle(dono).color),
              pontos: [[x, y]],
            });
          }
        }

        return [...porElemento.values()];
      }, resolveCor);
      if (!alvos.length) continue;

      const esconde = await pagina.addStyleTag({
        content: `main *, footer * { color: transparent !important }`,
      });
      await pagina.waitForTimeout(120);
      const png = await pagina.screenshot();
      await esconde.evaluate((n) => (n as unknown as HTMLStyleElement).remove());

      /*
       * ⚠️ **A AMOSTRAGEM ACONTECE DENTRO DO NAVEGADOR, e isso não é
       * microotimização.** A primeira versão devolvia o array inteiro de pixels
       * da captura para este processo — `Array.from(getImageData(...).data)` —
       * e atravessava a ponte do CDP com mais de um milhão de números por passo
       * de rolagem. Com 21 combinações de rota e largura, cada uma rolando uma
       * página de milhares de pixels, ela passou de 25 minutos e 1.680 segundos
       * de CPU sem terminar, e eu tive de matá-la.
       *
       * É exatamente a mesma ineficiência que `e2e/contraste.ts` tirou em 14/09,
       * quando a guarda do cartão de fechamento levava 12,7 s. Eu a
       * reintroduzi aqui por copiar a forma do projeto irmão sem trazer a lição.
       *
       * Agora vão os PONTOS para dentro e voltam só as cores deles: algumas
       * dezenas de valores por passo em vez de um milhão.
       *
       * A escala existe porque a captura sai na densidade do dispositivo e o
       * retângulo vem em pixels de CSS — sem ela os pontos caem no lugar errado
       * em qualquer tela que não seja 1×.
       */
      const medidas = await pagina.evaluate(
        async ({ b64, pedidos, larguraCss }) => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          const escala = img.width / larguraCss;
          /*
           * ⚠️ **Um pixel, e a MEDIANA de uma janela de 5×5 foi tentada e
           * desfeita em 15/09. Fica escrito para ninguém reinventá-la.**
           *
           * A reprova de 4,32:1 no preço de uma sobremesa — `text-brand` sobre
           * `bg-card`, par declarado de 4,80 — parecia ser amostra caída sobre o
           * fio de 1 px que separa as linhas da lista. A mediana de 25 pixels
           * rejeitaria um fio minoritário, e por isso ela foi escrita.
           *
           * Ela não mudou o número em nada, e a razão é que a hipótese estava
           * errada: despejando a janela crua, os 49 pixels em volta do ponto
           * eram um GRADIENTE suave de 234 a 243 — sombra, não borda. A causa
           * verdadeira é a sexta armadilha, documentada na grade.
           *
           * Desfeita porque defesa que não defende ainda cobra: a mediana troca
           * "pior pixel governa" por "pior vizinhança governa" e passaria a
           * perder texto fino sobre fundo listrado, que é defeito real.
           *
           * ⚠️ E a lição de percurso, que vale para qualquer edição aqui:
           * **nenhuma função NOMEADA dentro de um `evaluate`.** A mediana morava
           * num `const mediana = (v) => …` e a varredura morria com
           * `ReferenceError: __name is not defined` — o `tsx` compila este
           * arquivo com o `keepNames` do esbuild, que envolve toda função
           * batizada num auxiliar `__name(...)` declarado no MÓDULO, e o corpo
           * desta função é serializado para dentro do navegador, onde esse
           * auxiliar não existe. Nem `typecheck` nem `lint` veem isso.
           */
          return pedidos.map(({ x, y }) => {
            const px = Math.round(x * escala);
            const py = Math.round(y * escala);
            if (px < 0 || py < 0 || px >= img.width || py >= img.height) return null;
            const d = ctx.getImageData(px, py, 1, 1).data;
            return [d[0]!, d[1]!, d[2]!] as [number, number, number];
          });
        },
        {
          b64: png.toString("base64"),
          larguraCss: largura,
          pedidos: alvos.flatMap((a) => a.pontos.map(([x, y]) => ({ x, y }))),
        },
      );

      let cursor = 0;
      for (const alvo of alvos) {
        const [tr, tg, tb, alfa] = alvo.cor;
        // O laço anda pelos pontos deste alvo; quem interessa é a medida na
        // mesma posição da fila achatada que foi enviada ao navegador.
        for (let i = 0; i < alvo.pontos.length; i++) {
          const fundo = medidas[cursor++];
          if (!fundo) continue;
          amostras++;
          /*
           * A tinta é composta SOBRE O PIXEL antes da conta, porque é isso que
           * acontece na tela: texto a 70% sobre fundo escuro resulta numa cor
           * diferente do mesmo texto sobre fundo claro. É a mesma correção que
           * `e2e/contraste.ts` recebeu em 14/09.
           */
          const lTexto = luminancia(
            tr * alfa + fundo[0] * (1 - alfa),
            tg * alfa + fundo[1] * (1 - alfa),
            tb * alfa + fundo[2] * (1 - alfa),
          );
          const r = contraste(lTexto, luminancia(fundo[0], fundo[1], fundo[2]));
          if (r < MINIMO) {
            const chave = `${alvo.txt}|${fundo}`;
            if (!vistos.has(chave)) {
              vistos.add(chave);
              reprovas++;
              const linha = `  ❌ ${r.toFixed(2)}  "${alvo.txt}"  sobre rgb(${fundo})`;
              console.log(linha);
              achados.push(`${rota} ${nome}: ${linha.trim()}`);
            }
          }
          if (r < pior.r) pior = { r, txt: alvo.txt };
        }
      }
    }

    /*
     * ⚠️ **Sentinela: medir NADA não é passar.**
     *
     * Em 18/09 a varredura devolveu "0 amostras · pior — · ✅ 0 reprovas" para
     * `/cardapio` inteiro, nas três larguras, e eu quase li aquilo como página
     * limpa. A causa está na grade (o veto de sobrepostos comendo um fundo
     * `-z-10`), mas a lição é desta linha: sem isto, QUALQUER defeito que
     * impeça a amostragem — grade vetada, rota que não renderiza texto, seletor
     * que deixou de casar — aparece como aprovação.
     *
     * É a mesma família da guarda vacuamente verde que este repositório já
     * corrigiu em `preparado-para-as-fotos`, em `structured-data` e na de
     * `/llms.txt`: a asserção tem de falhar quando não tem o que examinar.
     *
     * O piso é baixo de propósito (30): rota curta com pouco texto existe, e o
     * que se quer pegar é a queda para perto de zero, não calibrar por página.
     */
    const MINIMO_DE_AMOSTRAS = 30;
    if (amostras < MINIMO_DE_AMOSTRAS) {
      reprovas++;
      const linha =
        `  ❌ só ${amostras} amostras (mínimo ${MINIMO_DE_AMOSTRAS}) — a varredura não ` +
        `mediu esta tela, e "0 reprovas" aqui não significaria nada`;
      console.log(linha);
      achados.push(`${rota} ${nome}:${linha}`);
    }

    const larguraRolagem = await pagina.evaluate(() => document.documentElement.scrollWidth);
    const vaza = larguraRolagem > largura;
    if (vaza) {
      reprovas++;
      const linha = `  ❌ rolagem horizontal: ${larguraRolagem}px numa tela de ${largura}px`;
      console.log(linha);
      achados.push(`${rota} ${nome}:${linha}`);
    }

    console.log(
      `${rota.padEnd(14)} ${nome.padEnd(8)} ${String(amostras).padStart(5)} amostras | ` +
        `pior ${pior.r === 99 ? "  —" : pior.r.toFixed(2)} | rolagem ${vaza ? "VAZA" : "ok"}`,
    );
    await pagina.close();
  }
}

await navegador.close();

if (achados.length) {
  console.log(`\n── ${achados.length} reprova(s) ──`);
  for (const a of achados) console.log(a);
}
console.log(reprovas === 0 ? "\n✅ 0 reprovas" : `\n❌ ${reprovas} reprovas`);
process.exit(reprovas === 0 ? 0 : 1);
