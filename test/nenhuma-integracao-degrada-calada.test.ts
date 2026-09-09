import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Toda integração opcional precisa dizer quando está desligada.
 *
 * Este projeto tem seis integrações que podem não estar configuradas, e cada uma
 * degrada de um jeito. O que elas NÃO podem fazer é degradar em silêncio, porque
 * silêncio imita funcionamento — e a ausência da coisa fica com a mesma
 * aparência da coisa funcionando, no build, nos testes e na tela.
 *
 * ⚠️ **Duas apareceram no mesmo dia, 02/09**, e as duas eram do mesmo formato:
 *
 * - As variáveis do Instagram estavam no schema do cliente, então o token seria
 *   sempre `undefined` e o feed nunca ligaria — sem nada acusar.
 * - O freio por IP caía para uma janela em memória sem avisar. Em produção, com
 *   instâncias recicladas, isso é quase nenhuma proteção com aparência de
 *   proteção.
 *
 * A varredura que gerou esta guarda achou que as outras quatro já avisavam. O
 * inventário abaixo é o que impede a sétima de entrar calada: uma variável
 * opcional nova quebra este teste até alguém declarar COMO a ausência dela
 * aparece para quem opera o site.
 */
const RAIZ = process.cwd();
const ENV = readFileSync(join(RAIZ, "src/lib/env.ts"), "utf8");

/** Variáveis do schema do servidor marcadas como opcionais. */
function opcionaisDoServidor(): string[] {
  const inicio = ENV.indexOf("const serverSchema = z.object({");
  const fim = ENV.indexOf("\n});", inicio);
  const corpo = ENV.slice(inicio, fim);
  // Cada declaração vai de um nome em maiúsculas até o próximo, ou o fim.
  const blocos = corpo.split(/\n(?=\s{2}[A-Z][A-Z0-9_]*:)/);
  return blocos
    .filter((b) => /\.optional\(\)/.test(b))
    .map((b) => /^\s*([A-Z][A-Z0-9_]*):/.exec(b)?.[1])
    .filter((n): n is string => Boolean(n));
}

/**
 * Como a ausência de cada integração aparece. O valor é o arquivo e o símbolo
 * que tornam a ausência VISÍVEL — não basta o código tratar o caso, alguém
 * precisa conseguir descobrir que ele aconteceu.
 */
const COMO_DEGRADA: Record<string, { arquivo: string; simbolo: string; nota: string }> = {
  EVOLUTION_BASE_URL: {
    arquivo: "src/lib/evolution.ts",
    simbolo: "isEvolutionConfigured",
    nota: "o painel do WhatsApp mostra o estado em vez de girar para sempre",
  },
  EVOLUTION_API_KEY: {
    arquivo: "src/lib/evolution.ts",
    simbolo: "isEvolutionConfigured",
    nota: "mesma checagem: as três variáveis andam juntas",
  },
  EVOLUTION_INSTANCE: {
    arquivo: "src/lib/evolution.ts",
    simbolo: "isEvolutionConfigured",
    nota: "mesma checagem",
  },
  WHATSAPP_INBOX_URL: {
    arquivo: "src/app/[locale]/admin/(dashboard)/leads/whatsapp/page.tsx",
    simbolo: "inboxNotConfigured",
    nota: "o cartão vira tracejado e diz que o link não está configurado",
  },
  KV_REST_API_URL: {
    arquivo: "src/lib/rate-limit.ts",
    simbolo: "avisoDeFreioFraco",
    nota: "registra [rate-limit] em produção: era o caso silencioso, corrigido em 02/09",
  },
  KV_REST_API_TOKEN: {
    arquivo: "src/lib/rate-limit.ts",
    simbolo: "avisoDeFreioFraco",
    nota: "mesma checagem: as duas andam juntas",
  },
  SUPABASE_URL: {
    arquivo: "src/lib/storage.ts",
    simbolo: "isStorageConfigured",
    nota: "o painel mostra 'Upload indisponível (storage não configurado)'",
  },
  SUPABASE_SECRET_KEY: {
    arquivo: "src/lib/storage.ts",
    simbolo: "isStorageConfigured",
    nota: "mesma checagem",
  },
  INSTAGRAM_ACCESS_TOKEN: {
    arquivo: "src/lib/instagram.ts",
    simbolo: "isInstagramConfigured",
    nota: "a seção não renderiza, e o RUNBOOK diz como ligar e onde ver o motivo",
  },
  INSTAGRAM_USER_ID: {
    arquivo: "src/lib/instagram.ts",
    simbolo: "isInstagramConfigured",
    nota: "mesma checagem",
  },
};

/**
 * Opcionais que NÃO são integração que liga e desliga: ou têm padrão seguro, ou
 * a ausência falha alto, no lugar certo. Elas não precisam de aviso, e exigir um
 * transformaria a guarda em ruído.
 *
 * A lista existe para a distinção ser deliberada: uma variável nova cai numa das
 * duas categorias por escrito, e não por esquecimento.
 */
const COM_PADRAO_OU_FALHA_ALTA: Record<string, string> = {
  DIRECT_URL:
    "conexão direta só para migração. Ausente, o `prisma migrate deploy` falha " +
    "no build da Vercel e o deploy para antes de publicar — alto, e no lugar certo",
  INSTAGRAM_API_VERSION:
    "tem padrão `v25.0`, fixado de propósito para a Meta não descontinuar a " +
    "versão numa terça-feira sem ninguém decidir",
  SUPABASE_BUCKET:
    "tem padrão `media`. Com o nome errado o upload falha e o painel mostra " +
    "'Bucket não encontrado', que é a mensagem específica desse caso",
};

describe("nenhuma integração opcional degrada calada", () => {
  const opcionais = opcionaisDoServidor();

  it("leu o schema de fato", () => {
    // Sentinela: um recorte errado deixaria a comparação abaixo vazia dos dois
    // lados, e o teste passaria sem verificar nada.
    expect(opcionais.length).toBeGreaterThan(5);
  });

  it("toda opcional do schema está no inventário, com a degradação escrita", () => {
    // Uma variável nova quebra aqui até alguém dizer como a ausência dela
    // aparece. É o ponto: a decisão passa a ser deliberada, não omissão.
    const declaradas = [
      ...Object.keys(COMO_DEGRADA),
      ...Object.keys(COM_PADRAO_OU_FALHA_ALTA),
    ];
    expect(opcionais.sort()).toEqual(declaradas.sort());
  });

  it("nenhuma variável está nas duas listas", () => {
    // Estar nas duas seria dizer que ela avisa E que não precisa avisar.
    const nos_dois = Object.keys(COMO_DEGRADA).filter(
      (k) => k in COM_PADRAO_OU_FALHA_ALTA,
    );
    expect(nos_dois, nos_dois.join(", ")).toEqual([]);
  });

  it("o símbolo que torna cada ausência visível existe de verdade", () => {
    // Sem isto, o inventário viraria prosa: alguém apagaria a checagem e a
    // documentação continuaria afirmando que ela existe.
    const faltando: string[] = [];
    for (const [variavel, { arquivo, simbolo }] of Object.entries(COMO_DEGRADA)) {
      const fonte = readFileSync(join(RAIZ, arquivo), "utf8");
      if (!fonte.includes(simbolo)) faltando.push(`${variavel}: ${simbolo} em ${arquivo}`);
    }
    expect(faltando, faltando.join("\n")).toEqual([]);
  });
});
