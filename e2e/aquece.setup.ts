import { test as setup } from "@playwright/test";

/**
 * Aquece as rotas antes de qualquer asserção rodar.
 *
 * **O problema, medido em 03/09/2026.** O servidor de desenvolvimento do Next
 * compila cada rota na PRIMEIRA visita. Com o cache apagado, medindo uma rota
 * de cada vez:
 *
 *     /              9,78 s na 1ª visita   ·  1,36 s na 2ª
 *     /experiencia   4,34 s                ·  0,28 s
 *     /cardapio      4,16 s                ·  0,83 s
 *     /contato       3,93 s                ·  0,50 s
 *     /reservas      3,18 s                ·  0,32 s
 *     /galeria       2,94 s                ·  0,19 s
 *     /novidades     2,93 s                ·  0,16 s
 *
 * O tempo padrão de asserção do Playwright é 5 s. Quem visita a home primeiro
 * espera quase o dobro disso, e a suíte roda `fullyParallel`, então várias
 * rotas compilam ao mesmo tempo e a contenção piora o quadro.
 *
 * ⚠️ **O sintoma era instabilidade que parecia aleatória.** Em três execuções
 * completas seguidas falharam três testes DIFERENTES — um de acessibilidade,
 * um de performance, um de página de erro — e cada um passava quando rodado
 * sozinho. Não era corrida entre testes: era o primeiro teste a tocar cada rota
 * pagando a compilação dela.
 *
 * ⚠️ **E o CI escondia isso por três caminhos ao mesmo tempo:** build de
 * produção (sem compilação sob demanda), `workers: 1` (sem contenção) e
 * `retries: 2` (um teste pode falhar duas vezes e ainda assim passar). Nenhum
 * dos três estava errado; juntos, faziam um defeito real parecer ruído local.
 *
 * Aquecer não afrouxa asserção nenhuma: os tempos continuam os mesmos, e o que
 * muda é o servidor já estar pronto quando eles começam a contar. Contra o
 * build de produção do CI o custo é de poucos segundos, porque lá não há
 * compilação a fazer — e a rodada continua sendo a mesma para os dois casos,
 * em vez de dois comportamentos diferentes que ninguém compara.
 */
const ROTAS = [
  // Páginas públicas, na ordem em que a suíte costuma tocá-las.
  "/",
  "/experiencia",
  "/cardapio",
  "/galeria",
  "/reservas",
  "/contato",
  "/novidades",
  // O painel: a suíte confere que ele exige sessão.
  "/admin",
  // Rotas de metadados, que também compilam sob demanda.
  "/sitemap.xml",
  "/robots.txt",
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon",
  "/opengraph-image",
  // A página de erro tem código próprio e compila como qualquer outra.
  "/rota-que-nao-existe-jamais",
];

setup("aquece as rotas para a primeira asserção não pagar a compilação", async ({
  request,
}) => {
  /*
   * Em paralelo de propósito. Aquecendo uma de cada vez o total passava de 30 s;
   * juntas, a contenção só torna o AQUECIMENTO mais lento, e não um teste
   * instável — que é exatamente para onde queremos empurrar esse custo.
   *
   * Sem asserção sobre o resultado: o objetivo é fazer o servidor compilar, e o
   * que cada rota responde já é verificado pelos specs que vêm depois. Um 404
   * aqui é resposta esperada para a última da lista, e falhar por causa dela
   * transformaria o aquecimento num teste disfarçado.
   */
  await Promise.all(
    ROTAS.map((rota) =>
      request.get(rota, { timeout: 90_000, failOnStatusCode: false }).catch(() => {
        // Uma rota que não responde não deve derrubar a suíte inteira aqui: o
        // spec que depende dela vai falhar sozinho, com a mensagem certa e
        // apontando para o lugar certo.
      }),
    ),
  );
});
