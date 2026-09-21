import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * O que o leitor de tela anuncia precisa dizer o que a coisa é.
 *
 * Quatro defeitos da mesma família, achados na auditoria de 27/08. Todos passam
 * em `typecheck`, `lint` e `build`, e nenhum tem regra de `axe` que os pegue:
 *
 * 1. **A nota do depoimento não existia para quem não enxerga.** As estrelas
 *    estavam `aria-hidden` e o rótulo vivia num `<div>` SEM `role` — e
 *    `aria-label` em elemento genérico é simplesmente ignorado. A nota não era
 *    anunciada de forma nenhuma.
 * 2. **`<figcaption>` sem `<figure>` pai.** O depoimento renderiza `as="li"`,
 *    então a legenda perdia o vínculo semântico com a citação.
 * 3. **`alt` repetindo o texto ao lado.** Ouvir "Feijoada, imagem" e logo
 *    "Feijoada, título nível 3" é ruído, não informação.
 * 4. **Rótulos crus.** O rodapé anunciava "instagram", em minúsculas, porque o
 *    `aria-label` era a chave do objeto. E o menu de novidades dizia "Abrir
 *    novidades" num `<a href>` que navega, prometendo um comportamento que o
 *    elemento não tem.
 *
 * ⚠️ Verificação por leitura da fonte, e não por render. Todos os componentes
 * envolvidos são Server Components assíncronos, que este setup de Vitest/jsdom
 * não renderiza — é o mesmo caminho de `test/keyboard-dropdowns.test.ts`, e pelo
 * mesmo motivo.
 */
const EXTENSOES = new Set([".tsx"]);

function arquivos(dir: string): string[] {
  const saida: string[] = [];
  for (const nome of readdirSync(dir)) {
    if (nome.startsWith(".")) continue;
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) saida.push(...arquivos(caminho));
    else if (EXTENSOES.has(extname(nome))) saida.push(caminho);
  }
  return saida;
}

const componentes = arquivos("src").map((c) =>
  relative(process.cwd(), c).split(sep).join("/"),
);
const fonte = (caminho: string) => readFileSync(caminho, "utf8");

/**
 * Extrai o valor de cada `alt=`, equilibrando as chaves.
 *
 * Uma expressao regular ingenua que para no primeiro fecha-chaves devolve pela
 * metade um `alt={t("qrAlt", { name: qr.instance })}` — foi o que ela fez na
 * primeira versao deste teste, produzindo uma entrada de inventario que nunca
 * casaria com nada.
 */
/**
 * Remove comentario antes de extrair — e a razao e a mesma que ja valeu para
 * `test/json-ld-sem-avaliacao.test.ts` em 18/09/2026.
 *
 * ⚠️ **Esta guarda reprovou a propria documentacao em 21/09/2026.** O docblock
 * que explica por que as fotos do hero usam `alt` vazio escreveu o termo, e o
 * extrator o contou como um `alt` nao inventariado em `json-ld.tsx` — arquivo
 * que nao desenha imagem nenhuma. Foi a oitava vez que uma guarda deste
 * repositorio tropecou na propria prosa, e a segunda em que a correcao e a
 * mesma: comentario descreve o padrao, codigo e que o aplica.
 *
 * ⚠️ O comentario de linha sai pelo INICIO da linha, nunca por ocorrencia de
 * `//` — varios arquivos deste projeto carregam `https://` dentro de string, e
 * cortar a partir de qualquer `//` decapitaria essas linhas. Uma string no
 * codigo continua valendo: so comentario sai.
 */
function semComentario(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function extrairAlts(entrada: string): string[] {
  const texto = semComentario(entrada);
  const saida: string[] = [];
  // Sem `\b` no padrao, e o motivo vale mais que a ausencia: ao escrever este
  // arquivo o `\b` da propria nota virou um BYTE 0x08 — backspace literal —
  // porque `\b` e escape valido em Python e o heredoc que gerou o arquivo o
  // converteu. O editor nao mostra o byte, entao o padrao parece certo e nunca
  // casa. Em 18/09 a mesma armadilha custou uma rodada de depuracao em
  // `test/preparado-para-as-fotos.test.ts`. A checagem do caractere anterior
  // faz o mesmo trabalho da borda de palavra, sem barra invertida nenhuma.
  const marca = /alt=/g;
  let achado: RegExpExecArray | null;
  while ((achado = marca.exec(texto)) !== null) {
    const anterior = texto[achado.index - 1] ?? " ";
    if (/[A-Za-z0-9_]/.test(anterior)) continue;
    let i = achado.index + achado[0].length;
    if (texto[i] === '"') {
      const fim = texto.indexOf('"', i + 1);
      saida.push(texto.slice(i, fim + 1));
      continue;
    }
    if (texto[i] !== "{") continue;
    let profundidade = 0;
    const inicio = i + 1;
    for (; i < texto.length; i++) {
      if (texto[i] === "{") profundidade++;
      else if (texto[i] === "}" && --profundidade === 0) break;
    }
    saida.push(texto.slice(inicio, i).trim());
  }
  return saida;
}

/**
 * Todo `alt` do projeto, com a decisão de cada um por escrito.
 *
 * A lista é o ponto: um `alt` novo entra aqui de propósito, e quem o adiciona
 * precisa dizer se ele informa ou se repete. Foi assim que os quatro
 * redundantes apareceram.
 */
const ALT_AUTORIZADO: Record<string, string[]> = {
  // Decorativos porque o texto ao lado já diz tudo.
  "src/components/menu-item-card.tsx": ['""'], // o <h3> logo abaixo é o nome do prato
  "src/components/sections/testimonials.tsx": ['""'], // o nome do autor está no <p>
  "src/components/information-card.tsx": ['""'], // foto sob véu, com o <h3> por cima
  "src/components/information-gallery.tsx": ['""'], // a <figcaption> descreve a imagem
  "src/components/sections/hero-carousel.tsx": ['""'], // fundo, com o texto sobreposto
  // Foto de fundo da abertura do cardápio, com a marca sobreposta. Decorativa
  // pelo mesmo motivo do topo da home: o texto por cima é que informa.
  /*
   * Decorativa: a garrafa abre a carta de vinhos, e a lista de rótulos e doses
   * logo abaixo é que informa. Um `alt` preenchido faria o leitor de tela
   * anunciar uma fotografia antes de chegar ao que a pessoa foi ler.
   */
  "src/app/[locale]/(marketing)/cardapio/page.tsx": ['""'],
  /*
   * Informativa POR EXCEÇÃO, e ela é a única foto de fundo do projeto com `alt`
   * preenchido. As outras faixas com imagem são decorativas — o texto por cima
   * informa. Aqui a foto é do AMBIENTE, que é o assunto da faixa: quem não vê
   * a fachada ou o salão perde a informação de como é o lugar, e o título
   * ("Horários", "Contato") não a repõe.
   *
   * A descrição carrega o número da rua de propósito: `test/o-endereco-e-o-mesmo-em-todo-lugar.test.ts`
   * exige que toda menção ao logradouro traga o mesmo número, e ela pegou esta
   * linha escrita sem ele.
   */
  "src/components/page-header.tsx": ["imageAlt"],
  "src/components/cardapio/menu-hero.tsx": ['""'],
  "src/app/[locale]/(marketing)/novidades/[slug]/page.tsx": ['""'], // capa; o <h1> vem abaixo
  // Informativo: sem legenda, o `alt` é a única descrição que existe.
  /*
   * Informativo: as três fotos abrem a ilha de massas, e o nome do prato é o
   * que separa uma da outra. Sem ele as três leriam "foto do prato" e
   * descreveriam uma massa repetida — que é o oposto do que o carrossel diz, já
   * que ele existe para mostrar que a ilha tem opções diferentes.
   *
   * A frase é montada no `PastaBuilder`, que roda no servidor e tem o catálogo,
   * e chega aqui pronta: o carrossel é componente de cliente e não traduz nada.
   */
  /*
   * Decorativo POR REDUNDÂNCIA: a logo é imagem desde 09/09, e o link que a
   * envolve já carrega `aria-label` com o nome do restaurante. Um `alt`
   * preenchido faria o leitor de tela dizer "Restaurante Prato" duas vezes
   * seguidas — uma pelo rótulo do link, outra pela imagem dentro dele.
   */
  "src/components/layout/logo.tsx": ['""'],
  "src/components/cardapio/pasta-carousel.tsx": ["foto.alt"],
  /*
   * Informativo: a foto da sobremesa é a única imagem da linha, e o nome ao
   * lado dela é o próprio conteúdo — quem usa leitor de tela ouviria "imagem"
   * e o nome duas vezes se o `alt` repetisse o rótulo genérico. Por isso ele
   * nomeia a sobremesa: "Foto de Torta holandesa".
   */
  "src/components/cardapio/dessert-list.tsx": [
    't("dishImageAlt", { name: sobremesa.name })',
  ],
  "src/components/gallery-photo-card.tsx": ['photo.caption ? "" : t("photoAlt")'],
  /*
   * Informativo POR CONDIÇÃO: a primeira linha da legenda do post descreve a
   * foto melhor que qualquer rótulo genérico. Sem legenda o `alt` fica vazio e
   * a imagem vira decorativa — o link para o post já se anuncia sozinho, e um
   * "publicação do Instagram" repetido quatro vezes seria ruído.
   */
  "src/components/sections/instagram-feed.tsx": ["alt"],
  // Painel. A auditoria olhou so o site publico; a mesma repeticao estava aqui.
  "src/app/[locale]/admin/(dashboard)/galeria/page.tsx": ['""'], // legenda logo abaixo
  "src/components/admin/image-upload-field.tsx": ['""'], // miniatura de previa
  // Informativo: o QR e o conteudo, e nao ha texto ao lado que o descreva.
  "src/components/admin/whatsapp-manager.tsx": ['t("qrAlt", { name: qr.instance })'],
};

describe("nomes acessíveis dizem o que a coisa é", () => {
  it("varreu de fato os componentes", () => {
    // Sentinela: um caminho errado faria tudo abaixo passar sobre lista vazia.
    expect(componentes.length).toBeGreaterThan(30);
  });

  it("todo alt do projeto está no inventário, com a decisão escrita", () => {
    const encontrados: Record<string, string[]> = {};
    for (const caminho of componentes) {
      const alts = extrairAlts(fonte(caminho));
      if (alts.length > 0) encontrados[caminho] = [...new Set(alts)].sort();
    }

    expect(Object.keys(encontrados).sort()).toEqual(
      Object.keys(ALT_AUTORIZADO).sort(),
    );
    for (const [caminho, alts] of Object.entries(encontrados)) {
      expect(alts, caminho).toEqual([...ALT_AUTORIZADO[caminho]].sort());
    }
  });

  it("a nota do depoimento é anunciada, e diz a escala", () => {
    const texto = fonte("src/components/sections/testimonials.tsx");
    // `aria-label` em elemento genérico é ignorado; precisa de papel.
    expect(texto).toMatch(/role="img"/);
    // "5/5" não se lê bem em voz alta; a escala precisa estar por extenso.
    expect(texto).toMatch(/ratingLabel/);
    expect(texto).not.toMatch(/aria-label=\{`\$\{item\.rating\}\/5`\}/);
  });

  it("nenhuma legenda de figura fica órfã de figure", () => {
    const orfas = componentes.filter(
      (c) => fonte(c).includes("<figcaption") && !fonte(c).includes("<figure"),
    );
    expect(orfas, orfas.join(", ")).toEqual([]);
  });

  it("o link de rede social se apresenta pela rede, e não pela chave do objeto", () => {
    const texto = fonte("src/components/layout/footer.tsx");
    expect(texto).not.toMatch(/aria-label=\{key\}/);
    expect(texto).toMatch(/socialLink/);
  });

  it("toda lista continua sendo uma lista no Safari", () => {
    /*
     * ⚠️ **`list-style: none` faz o WebKit tirar a semântica de lista**, e o
     * reset do Tailwind aplica isso a TODO `<ul>` e `<ol>` do projeto. Medido no
     * navegador: `/cardapio` tem 50 listas, e as 50 computam
     * `list-style-type: none`.
     *
     * O efeito é só no Safari com VoiceOver, que é uma fatia enorme de quem
     * abre um site de restaurante pelo telefone: em vez de "lista, 32 itens" a
     * pessoa ouve os itens soltos, um a um, sem saber quantos são nem que
     * pertencem a um conjunto. Num cardápio de 32 pratos, é a informação que
     * decide se vale ouvir a seção inteira ou pular para a próxima.
     *
     * `role="list"` devolve o que o CSS tirou. Não muda nada visualmente e não
     * muda nada no Chrome — é remendo de um comportamento de um motor só, e é
     * por isso que a regra tem de ser escrita: ninguém a deduz olhando a tela.
     *
     * A varredura exige `role` em qualquer `<ul>`/`<ol>` novo, e aceita
     * qualquer valor: uma lista que precise ser `role="tablist"` ou
     * `role="menu"` declarou uma escolha, que é justamente o que a guarda quer.
     * O que ela recusa é a AUSÊNCIA.
     */
    const semRole = arquivos("src")
      .flatMap((caminho) => {
        const texto = fonte(caminho);
        const achados: string[] = [];
        let i = 0;
        for (;;) {
          const m = /<(ul|ol)(?=[\s>])/.exec(texto.slice(i));
          if (!m) break;
          const abre = i + m.index;
          // Até o `>` que fecha a tag de abertura, ignorando os que estiverem
          // dentro de uma expressão `{...}` de JSX.
          let j = abre;
          let prof = 0;
          while (j < texto.length) {
            const c = texto[j];
            if (c === "{") prof++;
            else if (c === "}") prof--;
            else if (c === ">" && prof === 0) break;
            j++;
          }
          const tag = texto.slice(abre, j + 1);
          if (!/\srole=/.test(tag)) {
            achados.push(`${caminho}: <${m[1]}> sem role`);
          }
          i = j + 1;
        }
        return achados;
      });

    expect(semRole, semRole.join(" | ")).toEqual([]);
  });

  it("o menu de novidades não promete abrir o que ele navega", () => {
    // O elemento é um `<a href="/novidades">`: ele leva para a página.
    const texto = fonte("src/components/layout/information-menu.tsx");
    const rotulo = JSON.parse(
      readFileSync("src/messages/pt.json", "utf8"),
    ).novidades.menuLabel;
    expect(texto).toMatch(/aria-label=\{t\("menuLabel"\)\}/);
    expect(rotulo, "o rótulo de um link não pode prometer abrir").not.toMatch(
      /^Abrir /,
    );
  });
});
