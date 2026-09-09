import { describe, expect, it } from "vitest";

import { avisoDeFreioFraco } from "@/lib/rate-limit";

/**
 * O freio por IP degrada em silêncio, e silêncio aqui imita proteção.
 *
 * Sem `KV_REST_API_URL`/`KV_REST_API_TOKEN`, o limitador cai para uma janela em
 * MEMÓRIA, por instância. Em desenvolvimento isso é adequado: há uma instância
 * só e ela vive enquanto o servidor viver.
 *
 * Em produção na Vercel é outra coisa. Cada requisição pode cair numa instância
 * diferente, e elas são recicladas o tempo todo — então cada uma começa com o
 * contador zerado. O freio existe no código e quase não existe na prática, e
 * **nada em lugar nenhum dizia isso**.
 *
 * ⚠️ É exatamente o padrão que o AGENTS.md deste projeto proíbe: "nunca falhar
 * em silêncio de um jeito que imite um resultado diferente". A ausência de
 * proteção estava com a mesma aparência da proteção funcionando — nos testes,
 * no build e na tela.
 *
 * A decisão de avisar é uma função pura para poder ser exercitada nos quatro
 * cruzamentos. Lendo `env` direto, o teste só conseguiria exercitar o ambiente
 * em que ele mesmo roda.
 */
describe("o aviso de freio fraco", () => {
  it("avisa em produção sem Upstash, que é o caso perigoso", () => {
    const aviso = avisoDeFreioFraco({ configurado: false, producao: true });
    expect(aviso).not.toBeNull();
    // A mensagem tem de dizer O QUE fazer, não só que algo está errado: quem a
    // lê nos registros da Vercel não tem este arquivo aberto ao lado.
    expect(aviso).toMatch(/Upstash/i);
    expect(aviso).toMatch(/RUNBOOK|mem[óo]ria/i);
  });

  it("cala em produção com Upstash configurado", () => {
    expect(avisoDeFreioFraco({ configurado: true, producao: true })).toBeNull();
  });

  it("cala em desenvolvimento sem Upstash, onde a memória basta", () => {
    // Uma instância só, que vive enquanto o servidor viver. Avisar aqui seria
    // ruído a cada `npm run dev`, e ruído treina quem lê a ignorar o aviso.
    expect(avisoDeFreioFraco({ configurado: false, producao: false })).toBeNull();
  });

  it("cala em desenvolvimento com Upstash", () => {
    expect(avisoDeFreioFraco({ configurado: true, producao: false })).toBeNull();
  });
});
