import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * O servidor não anuncia com que tecnologia o site foi feito.
 *
 * O Next envia `X-Powered-By: Next.js` em toda resposta, por padrão. São ~25
 * bytes por requisição, o que é irrelevante — o que não é irrelevante é dizer a
 * quem varre a internet exatamente qual pilha rodar exploit contra. Não é
 * segredo que impeça um ataque decidido; é ruído a menos para o oportunista.
 *
 * ⚠️ **Medido nos dois lados, e a diferença é o ponto.** Na Vercel o cabeçalho
 * NÃO chega ao visitante: a plataforma o remove e responde apenas
 * `Server: Vercel`. Rodando o mesmo código localmente, ele aparece.
 *
 * Ou seja, hoje a proteção vem da hospedagem, não do código — a mesma forma do
 * freio por IP documentado em `lib/rate-limit.ts`. Sair da Vercel para um Node
 * atrás de nginx traria o cabeçalho de volta sem nada acusar.
 *
 * ⚠️ Por isso a guarda é de CONFIGURAÇÃO e não de navegador: um teste que
 * buscasse o site publicado passaria mesmo sem a correção, porque a Vercel já
 * limpa. Passaria vazio, escondendo que o código continua pedindo para enviar.
 */
const CONFIG = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

describe("o cabeçalho de resposta", () => {
  it("não declara a tecnologia do site", () => {
    expect(CONFIG).toMatch(/poweredByHeader:\s*false/);
  });

  it("continua sendo o arquivo de configuração — senão a guarda não guarda", () => {
    expect(CONFIG).toMatch(/const nextConfig: NextConfig/);
  });
});
