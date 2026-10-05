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
 * ⚠️ **A galeria mostra só COMIDA desde 10/09**, alinhando com o projeto
 * irmão: a decisão de lá é que "galeria é para o que se come". Fachada, salão e
 * balcão saíram — não foram descartados, mudaram de lugar para o topo das
 * páginas de Horários, Experiência e Contato, onde uma foto de ambiente diz
 * algo sobre estar lá em vez de disputar espaço com o prato.
 *
 * A ordem é a do próprio balcão: primeiro os frios, depois o quente, os fritos
 * por último, e um prato montado no fim — que é o resultado de tudo acima.
 * ⚠️ Desde 30/09 TRÊS fotos abrem a lista antes dessa sequência, a pedido do
 * dono; o motivo está junto delas, no topo do array.
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
/*
 * ⚠️ **A ORDEM desta lista passou a ser calculada em 05/10/2026**, a pedido do
 * dono: "mistura mais, tem muita foto parecida".
 *
 * Antes ela era narrativa — a sequência do balcão: frios, quente, fritos,
 * prato montado. Lia bem no papel e agrupava na tela justamente o que se
 * parece, porque fotos do mesmo ponto do balcão saem parecidas.
 *
 * Agora é ganância por dissemelhança: a cada passo entra a foto mais distante
 * das DUAS últimas colocadas, pela impressão digital. Medido: a vizinhança
 * mais parecida da galeria saiu de 18 para 25 (quanto maior, mais diferentes).
 *
 * ⚠️ **As três primeiras NÃO entram no cálculo.** Elas são a faixa "O nosso
 * espaço" da home (`slice(0, 3)` em `gallery-preview.tsx`), escolhidas a dedo
 * e já de assuntos diferentes. Deixar o algoritmo mexer nelas trocaria uma
 * decisão do dono por uma conta.
 *
 * Acrescentou foto? A ordem não se recalcula sozinha — ponha onde a vizinhança
 * não repetir assunto, ou rode a conta de novo.
 */
const FOTOS = [
  /* ⚠️ **Sete fotos saíram em 01/10/2026: o dono circulou o bloco do balcão e
     disse que repetem.** A varredura por impressão digital NÃO as acusava — o
     par mais próximo media 16, contra o limite de suspeita de 8. Ela casa
     composição, não assunto, e o que repetia era o assunto: seis fotos de
     bandeja fria, quatro de frito, duas de arroz com farofa.

     Agrupei por assunto e ficou a melhor de cada grupo:

       frios        ficam `frios-e-palmito`, `frios-do-balcao` e
                    `legumes-e-conservas`; saem `cenoura-ervilha-e-batata`,
                    `palmito-e-beterraba` e `ovo-cenoura-e-batata-palha`
       fritos       fica `salgados-fritos` e `pasteis`; saem
                    `salgados-variados` e `pasteis-no-prato`
       arroz        fica `arroz-farofa-feijao`; sai `arroz-farofa-e-ensopado`
       assados      fica `assados-e-batatas`; sai `batatas-feijao-e-couve-flor`

     É a mesma curadoria que a entrega de 10/09 já tinha feito uma vez, e que
     este docblock descreve logo abaixo: das vinte e cinco que chegaram, onze
     eram bandejas quase iguais. Ela foi feita com critério e ainda assim
     sobrou repetição visível — o sinal de que o limite automático é piso, não
     teto.

     ⚠️ Os ARQUIVOS ficam em `public/galeria`: são fotografia autoral do
     cliente, e ele não disse que são de outro projeto, disse que repetem.
     Devolver qualquer uma é acrescentar a linha de volta. */
  /* ⚠️ **Três saíram em 01/10/2026, e os ARQUIVOS de duas foram APAGADOS.**

     `travessas-do-balcao-frio` e, na vitrine, `salada-de-frutas`: o dono
     identificou as duas como material de OUTRO projeto. Na primeira eu só as
     tirei da lista e escrevi "o arquivo fica, para o registro não virar
     apagamento silencioso" — **e isso estava errado.** Medido no ar:
     `/galeria/travessas-do-balcao-frio.webp` respondia 200 com 149 KB. Tudo
     que está em `public/` é servido pela URL, referenciado ou não. Tirar da
     lista esconde a foto das páginas; não a tira do site. Para material de
     outro cliente isso não basta, então os arquivos foram removidos — o git
     guarda o histórico se um dia precisar provar o que havia.

     `balcao-de-saladas`: foi para o slide de abertura do topo da home, que o
     dono pediu com fotos exclusivas. Essa continua em `public/hero`. */
  /* ⚠️ **As quatro primeiras entraram em 01/10/2026, a pedido do dono, e
     ABREM a lista por pedido dele.** Vieram num lote de dezenove; as outras
     quinze já estavam publicadas e a varredura por impressão digital as pegou
     antes de duplicar — inclusive a do balcão quente, que é EXCLUSIVA do topo
     da home e entrar aqui desfaria a exclusividade pedida no mesmo dia.

     ⚠️ **A ordem das três primeiras não é só da galeria.** A faixa "O nosso
     espaço" da home mostra `slice(0, 3)` desta lista, então quem está aqui em
     cima aparece lá. Por isso a bebida entra entre as duas massas: sem ela, a
     faixa mostraria dois pratos de macarrão lado a lado, que é exatamente a
     repetição que o dono já mandou desfazer uma vez.

     ⚠️ **`balcao-das-massas` é o caso de fronteira desta lista.** A decisão de
     10/09 diz que a galeria mostra o que se come e que foto de LUGAR vai para o
     topo de uma página — e essa mostra o balcão, sem comida no quadro. Entrou
     porque a ilha de massas é um produto com preço próprio, e fotografar a
     estação é fotografar a oferta, não o salão. Se a regra for reapertada um
     dia, é esta que sai primeiro. */
  /* ⚠️ A legenda NÃO nomeia a fruta, e isso é deliberado: o cardápio só tem
     refrigerante e chá em garrafa, nada que corresponda a uma bebida batida.
     Perguntei ao dono o que era e não voltou resposta. Como a legenda é o texto
     que o leitor de tela pronuncia, chutar "açaí" ou "uva" seria inventar dado
     de cliente na voz de quem não vê a foto. */
  ["tres-massas-da-ilha.webp", "Três massas da ilha: pesto, penne ao molho branco e nhoque ao sugo"],
  ["bebida-de-frutas.webp", "Uma bebida gelada de frutas, servida em taça"],
  ["prato-feito-completo.webp", "Um prato montado, com arroz, bife, farofa, ovo, couve e torresmo"],
  ["buffet-de-saladas.webp", "A ilha de saladas, montada no começo do almoço"],
  ["nhoque-ao-sugo-e-pao.webp", "Nhoque ao sugo, com pão"],
  /* ⚠️ **As três primeiras entraram em 30/09/2026 e ABREM a lista por pedido
     explícito do dono**, que apontou a faixa "O nosso espaço" da home e mandou
     estas fotos para ela. A home renderiza `slice(0, 3)` sobre `order`
     (`gallery-preview.tsx`), então qualquer outra posição significaria não
     aparecer onde ele pediu — a ordem daqui é o único controle que existe.

     ⚠️ **Duas delas têm o salão ao fundo, e nem o nome nem a legenda dizem
     isso.** O primeiro rascunho chamava as duas de "-no-salao" e legendava
     "servida no salão", porque eu tinha usado o fundo como argumento de que
     elas casam com o TÍTULO da faixa. `test/a-galeria-mostra-comida.test.ts`
     reprovou, e a guarda está certa: a decisão de 10/09 é que a galeria mostra
     o que se come, e o ambiente vai para o topo de uma página. O assunto destas
     duas é o prato; a mesa e a luz são profundidade de campo. Nomear pelo fundo
     era transformar foto de comida em foto de lugar no único campo que o site
     lê — e, como a legenda virou o `alt` em 25/09, quem usa leitor de tela
     ouviria o lugar no lugar do prato.

     A sequência do balcão descrita no docblock não foi desfeita — ela começa
     logo abaixo destas três. */
  ["massa-ao-pesto-com-manjericao.webp", "Massa ao pesto, com manjericão e queijo ralado"],
  ["frango-ao-molho-verde.webp", "Frango ao molho verde, com arroz e vinagrete"],
  ["frios-do-balcao.webp", "As conservas e os grãos"],
  ["linguica-na-brasa.webp", "Linguiça assando na brasa, no espeto"],
  ["penne-com-rucula-e-alcaparras.webp", "Penne com rúcula, azeitonas e alcaparras"],
  ["assados-e-batatas.webp", "Assados e batatas"],
  ["pasteis.webp", "Os pastéis, fritos na hora"],
  /* ⚠️ **`servindo-no-balcao` saiu em 01/10/2026, a pedido do dono.** O
     arquivo continua em `public/galeria` — só não é publicado. Era a única
     foto da galeria com uma PESSOA no quadro, e a curadoria de 10/09 a tinha
     escolhido justamente por isso ("a única que mostra gente usando o
     lugar"). Esse argumento não vale mais: quem decide é o dono, e fica
     registrado para ninguém a devolver citando a nota antiga. */
  // O balcão quente.
  ["buffet-quente-ensopados.webp", "Os ensopados do dia"],
  ["frios-e-palmito.webp", "Os frios, com palmito e couve-flor"],
  // Um prato montado, que é o resultado de tudo acima.
  ["prato-servido.webp", "Um prato montado, com salada e batata"],
  ["corte-dourado-na-brasa.webp", "Corte dourado no espeto, pronto para fatiar"],
  ["file-a-milanesa-com-fritas.webp", "Filé à milanesa, com fritas, arroz e salada de maionese"],
  ["balcao-quente-em-bandejas.webp", "O balcão quente, com as bandejas de carnes, ovos e guarnições"],
  ["file-de-frango-grelhado.webp", "Filé de frango grelhado, com salada e vinagrete"],
  ["panquecas-com-arroz.webp", "Panquecas ao molho, com arroz e salada"],
  ["balcao-das-massas.webp", "O balcão da ilha de massas, onde o prato é preparado na hora"],
  // Os fritos, que fecham o balcão.
  ["salgados-fritos.webp", "Os bolinhos, fritos na hora"],
  ["legumes-e-conservas.webp", "Legumes e conservas"],
  ["corte-selado-na-brasa.webp", "Corte selado na brasa, no espeto"],
  /* ⚠️ **`tres-massas-da-ilha` entrou em 01/10/2026 porque o dono pediu MAIS
     MASSA na galeria.** É a quarta foto, logo abaixo da faixa que a home
     mostra: aparecer dentro das três primeiras colocaria duas fotos de massa
     lado a lado lá em cima, que ele já mandou desfazer uma vez.

     ⚠️ **A maior reserva de massa NÃO está aqui: são as oito fotos do
     carrossel de `/cardapio`.** Trazer qualquer uma para cá significa a mesma
     foto em duas páginas — não é proibido como no topo da home, mas é decisão
     do dono, não minha. Não traga sem perguntar. */
  /* ⚠️ **`balcao-quente-em-cubas` e `churrasco` saíram em 01/10/2026** para o
     topo da home, que o dono pediu com fotos exclusivas. Os ARQUIVOS
     continuam em `public/galeria` — só não entram na galeria. Devolver é
     acrescentar a linha de volta, e aí o topo deixa de ser exclusivo. */
  // Os frios, que é por onde o balcão começa.
  /* ⚠️ **Seis fotos entraram em 01/10/2026**, da leva que o dono mandou. Elas
     se encaixam na sequência do balcão descrita no docblock em vez de abrir a
     lista: três são o próprio balcão (frio, saladas, quente em cubas) e três
     são prato pronto, que é onde a sequência termina. As três que abrem a
     lista continuam sendo as de 30/09, porque é a faixa da home que elas
     servem.

     Da mesma leva ficaram de FORA as que repetiam assunto já publicado —
     ver a varredura por impressão digital registrada no relatório do dia. */
  ["balcao-frio-com-molhos.webp", "O balcão frio, com os molhos e os temperos na prateleira"],
  ["bife-acebolado-com-farofa.webp", "Bife acebolado, com arroz, feijão e farofa"],
  ["ilha-de-saladas-com-frutas.webp", "A ilha de saladas, com as frutas do dia"],
  ["pernil-assado.webp", "O pernil assado, inteiro na travessa"],
  ["file-de-frango-gratinado.webp", "Filé de frango gratinado, com arroz e brócolis"],
];

async function main() {
  carregaEnv();

  /*
   * ⚠️ **Arquivo repetido na lista, que em 01/10/2026 eu mesmo causei.** Ao
   * mover uma foto de posição, a entrada antiga ficou para trás e `FOTOS`
   * passou a citar `prato-feito-completo` duas vezes.
   *
   * `createMany` teria publicado AS DUAS, com `order` diferente — a mesma
   * foto em dois pontos da galeria, e o script relatando sucesso. Não é
   * erro de banco: `GalleryPhoto` não tem chave única além do id, que é
   * exatamente o motivo de este script apagar e reinserir em vez de fazer
   * upsert. A lista é a única fonte de verdade, então é aqui que se confere.
   */
  const vistos = new Set();
  const repetidos = [...new Set(FOTOS.map(([a]) => a).filter((a) => vistos.size === vistos.add(a).size))];
  if (repetidos.length) {
    console.error("Arquivo citado mais de uma vez em FOTOS:");
    for (const a of repetidos) console.error("  ✗", a);
    process.exit(1);
  }
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
