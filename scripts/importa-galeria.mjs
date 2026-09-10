/**
 * Carga das fotos da galeria.
 *
 * As fotos chegaram do cliente em 03/09/2026 e são autorais: o salão, o balcão,
 * a fachada e a brasa do próprio Prato. Os arquivos vivem em `public/galeria`,
 * versionados junto com o código; o que este script escreve no banco é só a
 * LISTA — caminho, legenda e ordem.
 *
 * ⚠️ **Por que os arquivos ficam em `public` e não no Storage.** O painel envia
 * para o Supabase Storage, e é assim que o cliente acrescenta foto no dia a dia.
 * Estas são a carga inicial: colocá-las em `public` faz o `next/image` servir
 * AVIF/WebP da mesma origem, sem ida a servidor externo na primeira pintura, e
 * faz elas sobreviverem a uma restauração de banco sem depender do bucket.
 *
 * ⚠️ **Idempotência sem slug.** `GalleryPhoto` não tem campo único além do id,
 * então não dá para casar por `upsert`. O script apaga o que ele mesmo
 * gerencia — as linhas cujo `image` começa com `/galeria/` — e insere de novo.
 * Foto enviada pelo painel aponta para uma URL do Storage e **não** é tocada.
 *
 * Uso:
 *   node scripts/importa-galeria.mjs --dry-run
 *   node scripts/importa-galeria.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const DRY = process.argv.includes("--dry-run");
const PREFIXO = "/galeria/";

function carregaEnv() {
  if (!existsSync(".env")) return;
  for (const linha of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(linha.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

/**
 * A ordem é a de uma visita: chega-se pela rua, entra-se no salão, e só então
 * se vê a comida — primeiro os frios, depois o quente, e os fritos por último,
 * que é a ordem do próprio balcão. Abrir pela travessa de pastéis mostraria o
 * prato antes do lugar, e a galeria existe para dizer como é estar lá.
 *
 * ⚠️ **Seis fotos entraram em 10/09, escolhidas de dezessete, e a curadoria é
 * a parte que importa.** O cliente mandou vinte e cinco arquivos; sete eram
 * repetição exata do que já estava no projeto, e uma era o mesmo quadro da
 * ilha de saladas com recorte levemente diferente — essa passou pela
 * comparação automática por um fio, com distância 9 contra o limite de 8, e só
 * caiu ao ser olhada lado a lado.
 *
 * Das dezessete inéditas, ONZE eram bandejas de frios quase iguais entre si:
 * beterraba, batata e ovo de ângulos diferentes. Pixel a pixel não repetem;
 * como assunto, repetem. Publicar as onze faria uma galeria monótona e pesada,
 * então entrou a melhor de cada grupo — frios, quente, ensopado, assado,
 * fritos e uma com pessoa montando o prato, que é a única que mostra gente
 * usando o lugar.
 *
 * A legenda é texto VISÍVEL ao lado da foto, não texto alternativo. É por isso
 * que ela descreve o que se vê em vez de rotular ("Foto 3"): quando existe
 * legenda, o `alt` da imagem fica vazio de propósito, porque a legenda já
 * cumpre esse papel e repetir faria o leitor de tela dizer tudo duas vezes.
 */
const FOTOS = [
  // A rua e o salão: onde a pessoa chega.
  ["fachada.webp", "A fachada na Rua Augusto Severo, 25"],
  ["salao.webp", "O salão, com a ilha de massas ao fundo"],
  ["balcao-e-salao.webp", "O balcão visto do salão"],
  // Os frios, que é por onde o balcão começa.
  ["buffet-de-saladas.webp", "A ilha de saladas, montada no começo do almoço"],
  ["ilha-de-saladas-com-frutas.webp", "A ilha de saladas, com as frutas do dia"],
  ["frios-e-palmito.webp", "Os frios, com palmito e couve-flor"],
  ["frios-do-balcao.webp", "As conservas e os grãos"],
  ["legumes-e-conservas.webp", "Legumes e conservas"],
  ["cenoura-ervilha-e-batata.webp", "Cenoura, ervilha e batata"],
  ["palmito-e-beterraba.webp", "Palmito e beterraba"],
  ["ovo-cenoura-e-batata-palha.webp", "Ovo, cenoura e batata palha"],
  ["servindo-no-balcao.webp", "Montando o prato no balcão"],
  // O balcão quente.
  ["buffet-quente.webp", "O buffet quente, com risoto, lasanha e batatas"],
  ["arroz-farofa-feijao.webp", "Arroz, farofa e feijão, sempre no balcão quente"],
  ["arroz-farofa-e-ensopado.webp", "Arroz, farofa e o ensopado do dia"],
  ["buffet-quente-ensopados.webp", "Os ensopados do dia"],
  ["assados-e-batatas.webp", "Assados e batatas"],
  ["batatas-feijao-e-couve-flor.webp", "Batatas, feijão e couve-flor"],
  ["pernil-assado.webp", "O pernil assado, inteiro na travessa"],
  ["churrasco.webp", "O churrasco na brasa, fatiado na hora"],
  // Os fritos, que fecham o balcão.
  ["salgados-fritos.webp", "Os bolinhos, fritos na hora"],
  ["salgados-variados.webp", "Os salgados do balcão"],
  ["pasteis.webp", "Os pastéis, fritos na hora"],
  ["pasteis-no-prato.webp", "Pastéis servidos no prato"],
  // Um prato montado, que é o resultado de tudo acima.
  ["prato-servido.webp", "Um prato montado, com salada e batata"],
];

async function main() {
  carregaEnv();

  const faltando = FOTOS.filter(([arquivo]) => !existsSync(`public${PREFIXO}${arquivo}`));
  if (faltando.length) {
    // Sem isto o banco apontaria para arquivos que não existem, e a galeria
    // renderizaria quadros quebrados — que é pior que galeria vazia.
    console.error("Arquivo não encontrado em public/galeria:");
    for (const [a] of faltando) console.error("  ✗", a);
    process.exit(1);
  }

  console.log(`${FOTOS.length} fotos, todas presentes em public${PREFIXO}`);
  for (const [arquivo, legenda] of FOTOS) {
    console.log(`  ${arquivo.padEnd(24)} ${legenda}`);
  }

  if (DRY) {
    console.log("\n--dry-run: nada foi escrito.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const apagadas = await prisma.galleryPhoto.deleteMany({
      where: { image: { startsWith: PREFIXO } },
    });
    await prisma.galleryPhoto.createMany({
      data: FOTOS.map(([arquivo, legenda], i) => ({
        image: `${PREFIXO}${arquivo}`,
        caption: { pt: legenda },
        order: i + 1,
        published: true,
      })),
    });
    console.log(`\nGaleria importada (${apagadas.count} linha(s) anterior(es) substituída(s)).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
