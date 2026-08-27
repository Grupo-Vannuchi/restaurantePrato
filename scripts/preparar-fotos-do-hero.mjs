/**
 * Prepara fotos para o topo da página inicial.
 *
 * O carrossel do topo serve os arquivos direto de `public/hero`, sem passar pelo
 * otimizador de imagem sob demanda — então o arquivo que entra ali é o arquivo
 * que o visitante baixa, e a primeira foto é o maior elemento da página (o que o
 * Google mede como LCP). Daí o orçamento apertado.
 *
 * Uso:
 *   node scripts/preparar-fotos-do-hero.mjs <pasta-de-entrada> <pasta-de-saida>
 *
 * ⚠️ A saída NÃO vai para `public/` de propósito. Preparar não é publicar: a
 * decisão de usar uma foto é de quem responde pelo restaurante, e o script não
 * a toma por ninguém. Copiar para `public/hero` é um passo manual, consciente.
 *
 * O que ele faz e por quê:
 *
 * - **1600×900**, cobrindo o quadro. O topo é 16:9 e ocupa a largura toda; um
 *   arquivo maior que isso é banda jogada fora, e menor borra em tela grande.
 * - **WebP**, com a qualidade escolhida por BUSCA, não por chute: tenta 82, e
 *   vai baixando até caber no teto de 230 KB. Fixar a qualidade num número
 *   produz arquivo de 400 KB numa foto de textura e de 60 KB numa foto lisa.
 * - **Corta pelo centro**, e avisa quando corta muito: uma foto cujo motivo
 *   está na borda perde o motivo, e é melhor saber antes de publicar.
 */
import sharp from "sharp";
import { readdir, mkdir, writeFile, stat } from "node:fs/promises";
import { join, parse } from "node:path";

const LARGURA = 1600;
const ALTURA = 900;
const TETO_BYTES = 230 * 1024;
const QUALIDADES = [82, 76, 70, 64, 58, 52];

const [entrada, saida] = process.argv.slice(2);
if (!entrada || !saida) {
  console.error("uso: node scripts/preparar-fotos-do-hero.mjs <entrada> <saida>");
  process.exit(1);
}

await mkdir(saida, { recursive: true });
const arquivos = (await readdir(entrada)).filter((n) =>
  /\.(png|jpe?g|webp)$/i.test(n),
);

if (arquivos.length === 0) {
  console.error(`nenhuma imagem em ${entrada}`);
  process.exit(1);
}

/** Trecho que distingue um arquivo dos outros, para o relatório ser legível. */
function rotulo(nome) {
  return nome.length > 25 ? "..." + nome.slice(-22) : nome;
}

console.log(`${arquivos.length} imagens · alvo ${LARGURA}x${ALTURA} · teto ${Math.round(TETO_BYTES / 1024)} KB\n`);
console.log("arquivo".padEnd(26), "original".padStart(9), "saida".padStart(8), "qual.".padStart(6), "  corte");
console.log("─".repeat(72));

for (const nome of arquivos.sort()) {
  const origem = join(entrada, nome);
  const meta = await sharp(origem).metadata();
  // `metadata().size` não vem preenchido para todo formato; o tamanho do
  // arquivo é do sistema de arquivos, não do decodificador.
  const bytesOrigem = (await stat(origem)).size;

  // quanto do quadro original se perde ao cobrir 16:9
  const propOrigem = meta.width / meta.height;
  const propAlvo = LARGURA / ALTURA;
  const perda =
    propOrigem > propAlvo
      ? 1 - propAlvo / propOrigem // corta nas laterais
      : 1 - propOrigem / propAlvo; // corta em cima e embaixo

  let escolhido = null;
  for (const qualidade of QUALIDADES) {
    const buf = await sharp(origem)
      .resize(LARGURA, ALTURA, { fit: "cover", position: "centre" })
      .webp({ quality: qualidade })
      .toBuffer();
    escolhido = { buf, qualidade };
    if (buf.length <= TETO_BYTES) break;
  }

  const destino = join(saida, `${parse(nome).name}.webp`);
  await writeFile(destino, escolhido.buf);

  const dentro = escolhido.buf.length <= TETO_BYTES;
  console.log(
    // O que distingue estes arquivos está no FIM do nome, não no começo:
    // todos começam igual. Truncar pela esquerda produziria 11 linhas idênticas.
    rotulo(parse(nome).name).padEnd(26),
    `${Math.round(bytesOrigem / 1024)}KB`.padStart(9),
    `${Math.round(escolhido.buf.length / 1024)}KB`.padStart(8),
    String(escolhido.qualidade).padStart(6),
    "  " + (perda > 0.02 ? `${(perda * 100).toFixed(0)}% do quadro` : "nenhum"),
    dentro ? "" : "  ⚠ ACIMA DO TETO",
  );
}

console.log(`\nprontas em ${saida}`);
console.log("Nada foi publicado: copiar para public/hero é passo manual.");
