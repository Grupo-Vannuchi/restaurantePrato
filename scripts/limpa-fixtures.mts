/**
 * Apaga as fixtures de teste do banco LOCAL.
 *
 * ⚠️ **Existe porque o dono do projeto viu "Teste E2E · prato permanente" no
 * cardápio do servidor local DUAS vezes — 18/09 e 21/09/2026 — e perguntou por
 * que o site estava assim.** Nas duas o banco já estava limpo: o que sobrava era
 * o retrato. `/cardapio` é pré-renderizada, então a página congela o cardápio do
 * momento do `build`, e uma build feita durante um ciclo de teste guarda as
 * fixtures mesmo depois de o `globalTeardown` apagá-las.
 *
 * A correção não é lembrar: é este comando.
 *
 *   npm run e2e:limpa && npm run build
 *
 * Rode isso ao terminar um ciclo de teste, antes de deixar o servidor de pé
 * para alguém revisar. Sem isso, quem abre o localhost vê comida que não existe
 * e — pior — pode concluir que o site publicado está assim.
 *
 * ⚠️ Só age contra banco local, pela mesma verificação de `e2e/semeia-cardapio.ts`:
 * apaga por PREFIXO, nunca `deleteMany({})`, porque o banco local pode ter
 * conteúdo que alguém cadastrou à mão para conferir outra coisa.
 */
import { PrismaClient } from "@prisma/client";

import { limpar, PREFIXO, rodaContraLocal } from "../e2e/semeia-cardapio";

if (!rodaContraLocal) {
  console.error(
    "Este script só age contra servidor local. `E2E_BASE_URL` aponta para " +
      "outro lugar — nada foi apagado.",
  );
  process.exit(1);
}

await limpar();

const prisma = new PrismaClient();
try {
  const sobraram = await prisma.menuItem.count({
    where: { slug: { startsWith: PREFIXO } },
  });
  const reais = await prisma.menuItem.count();
  console.log(`fixtures restantes: ${sobraram} · pratos no banco: ${reais}`);
  if (sobraram > 0) {
    console.error("ainda há fixture no banco — a limpeza não fechou");
    process.exit(1);
  }
  console.log(
    "Agora reconstrua, senão a página pré-renderizada continua mostrando as " +
      "fixtures:  npm run build",
  );
} finally {
  await prisma.$disconnect();
}
