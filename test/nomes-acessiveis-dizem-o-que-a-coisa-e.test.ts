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
function extrairAlts(texto: string): string[] {
  const saida: string[] = [];
  // Sem `` no padrao: a barra invertida nao sobrevive as camadas de escape
  // ate aqui. A checagem do caractere anterior faz o mesmo trabalho.
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
  "src/app/[locale]/(marketing)/novidades/[slug]/page.tsx": ['""'], // capa; o <h1> vem abaixo
  // Informativo: sem legenda, o `alt` é a única descrição que existe.
  "src/components/gallery-photo-card.tsx": ['photo.caption ? "" : t("photoAlt")'],
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
