import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Nenhum arquivo de ambiente que aponte para produção pode ser carregado
 * automaticamente por `next build` / `next start`.
 *
 * ⚠️ **O que aconteceu em 18/09/2026.** Existia um `.env.production.local` com
 * o `DATABASE_URL` do Supabase do cliente — provavelmente escrito por
 * `vercel env pull --environment=production`, que é o nome padrão que aquele
 * comando usa. `next build` e `next start` rodam com `NODE_ENV=production`, e aí
 * o Next carrega `.env.production.local` **antes** do `.env`.
 *
 * Consequência: subir um build de produção local — que é justamente o que se
 * deve medir — dava um servidor em `localhost` ligado ao banco de PRODUÇÃO. As
 * páginas eram pré-renderizadas com os dados do cliente, a semeadura do
 * `globalSetup` nunca aparecia, e `e2e/contact.spec.ts` (que ENVIA o formulário)
 * não se pulava, porque o guarda dele decide pelo alvo ser `localhost`.
 *
 * O aviso estava escrito no `playwright.config.ts` desde 14/09, e eu passei por
 * ele duas vezes no mesmo dia atribuindo a falha à ordem de semeadura. Por isso
 * o conserto é mecânico e está em dois lugares: o portão de banco em
 * `e2e/e-o-site-deste-cliente.setup.ts`, que impede a suíte de escrever, e esta
 * guarda, que impede o arquivo de voltar calado.
 *
 * ⚠️ **E ele VOLTA.** Um `vercel env pull --environment=production` o recria com
 * o mesmo nome, sem avisar que aquele nome é especial para o Next. É por isso que
 * a guarda vigia o nome em vez de confiar em disciplina.
 *
 * As credenciais de produção seguem na máquina, no arquivo renomeado — o que
 * muda é que carregá-las passa a ser um ato explícito.
 */

/**
 * Os nomes que o Next carrega sozinho quando `NODE_ENV=production`, em ordem de
 * precedência. `.env` fica FORA da lista de propósito: é o do Docker local, e é
 * exatamente o que se quer que um build local use.
 */
const CARREGADOS_EM_PRODUCAO = [".env.production.local", ".env.production"];

/** Onde as credenciais de produção devem morar: nome que o Next ignora. */
const NOME_SEGURO = ".env.producao";

describe("os arquivos de ambiente", () => {
  it.each(CARREGADOS_EM_PRODUCAO)(
    "não tem %s, que o build carregaria sem pedir",
    (nome) => {
      expect(
        existsSync(join(process.cwd(), nome)),
        `\`${nome}\` existe, e \`next build\`/\`next start\` o carregam ANTES do ` +
          `\`.env\`: um servidor local passa a ler o banco de produção.\n\n` +
          `Se veio de \`vercel env pull --environment=production\`, renomeie:\n` +
          `  mv ${nome} ${NOME_SEGURO}\n\n` +
          `Para rodar algo CONTRA produção, carregue explicitamente — é o ato ` +
          `que deve doer:\n` +
          `  DATABASE_URL=<da ${NOME_SEGURO}> node scripts/<script>.mjs\n\n` +
          `Ver docs/RUNBOOK.md.`,
      ).toBe(false);
    },
  );

  it("continua existindo um `.env` local — senão nada roda nesta máquina", () => {
    /*
     * A sentinela, e ela não é decoração: sem `.env` a guarda acima passaria
     * num repositório sem ambiente nenhum, que é o estado em que ela não tem
     * nada a proteger. No CI e na Vercel não há arquivo de ambiente algum — as
     * variáveis são injetadas —, então lá esta asserção se pula.
     */
    if (process.env.CI) return;
    expect(
      existsSync(join(process.cwd(), ".env")),
      "sem `.env`: rode `cp .env.example .env` e aponte para o Docker local",
    ).toBe(true);
  });
});
