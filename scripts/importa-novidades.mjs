/**
 * Carga das páginas de busca local (`/novidades/<slug>`).
 *
 * São as páginas que enchem o menu suspenso do cabeçalho — o "hambúrguer" — e
 * a listagem de `/novidades`. Cada uma mira um jeito real de alguém procurar a
 * casa no Google: "restaurante por quilo no Centro de Santos", "onde almoçar
 * perto da Praça Mauá", "como chegar".
 *
 * ⚠️ **O projeto irmão tem o mesmo sistema, e a ESTRUTURA veio dele — o
 * conteúdo, não.** Copiar as páginas dele plantaria o texto e os fatos de
 * outro cliente neste repositório, que é exatamente o que
 * `test/brand-hygiene.test.ts` varre e proíbe. O que se reaproveita é o
 * contrato: validar antes de gravar, recusar a carga inteira, e nunca afirmar
 * serviço que a casa não tem.
 *
 * ⚠️ **Toda frase sai dos dados confirmados** em
 * `docs/WHITELABEL-RESTAURANTE-PRATO.md`: endereço, horário, buffet por quilo,
 * churrasco na brasa, ilha de massas, formas de pagamento, 1998, os marcos que
 * o cliente citou. Nada de "ambiente climatizado", "atendimento rápido" ou
 * qualquer adjetivo que ninguém confirmou — num texto de SEO isso vira promessa
 * publicada, e quem chega cobra na porta.
 *
 * Uso:
 *   node scripts/importa-novidades.mjs --dry-run   # confere sem escrever
 *   node scripts/importa-novidades.mjs             # escreve
 *
 * É idempotente: as páginas são casadas por slug. **Mas sobrescreve edições
 * feitas no painel** para esses mesmos slugs.
 */
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const DRY = process.argv.includes("--dry-run");

/** O CLI do Prisma carrega o `.env` sozinho; um script solto, não. */
function carregaEnv() {
  if (!existsSync(".env")) return;
  for (const linha of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(linha.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

/**
 * Os ícones que `components/ui/icon.tsx` conhece.
 *
 * ⚠️ Não é a lista do lucide: este projeto mantém um `Record` curto de
 * propósito, porque ele é estático e embarca em toda página pública. Nome fora
 * daqui não quebra o card — cai numa faísca neutra —, mas publica um ícone que
 * não é o pedido, em silêncio.
 */
const ICONES = [
  "Instagram", "Camera", "Info", "BookOpen", "FileText", "Newspaper",
  "ShieldCheck", "Building2", "Scale", "Flame", "UtensilsCrossed", "MapPin", "Clock",
];

/** Rotas que existem. Link interno para rota inventada é 404 servido a quem veio da busca. */
const ROTAS = ["/", "/cardapio", "/reservas", "/contato", "/galeria", "/experiencia", "/novidades"];

/**
 * O que a casa NÃO tem, ou não confirmou.
 *
 * ⚠️ **Esta lista é do PRATO, e escrevê-la copiando a do irmão seria o erro que
 * ela existe para impedir.** A dele proíbe "feijoada" — o Prato serve carnes de
 * feijoada na quarta, então aqui isso é fato, não promessa. E a nossa proíbe
 * coisas que a dele não precisa: o Prato fecha no fim de semana e não tem
 * telefone fixo.
 *
 * Dizer que NÃO tem é correto e desejável. Errado é AFIRMAR. Por isso a
 * checagem lê a frase inteira em volta da palavra — em português a negação cai
 * dos dois lados, e "não abrimos no sábado" e "sábado a casa não abre" dizem o
 * mesmo.
 */
const AUSENTES =
  /estacionament\w*|manobrist\w*|acessibilidad\w*|cadeirante\w*|delivery|tele-?entrega|rod[íi]zio|jantar|noite|madrugada|s[áa]bado|domingo|fim de semana|telefone fixo|prato feito/gi;

const NEGACAO = /\bn(ã|a)o\b|\bsem\b|\bnenhum\w*\b|\bfecha\w*\b|\bapenas\b|\bs(ó|o)\b/i;

/** Acha promessa que a casa não sustenta, ignorando as frases que NEGAM. */
function afirmaOQueNaoTem(texto) {
  const achados = [];
  for (const m of texto.matchAll(AUSENTES)) {
    const inicio = Math.max(0, texto.lastIndexOf(".", m.index) + 1);
    const fim = texto.indexOf(".", m.index);
    const frase = texto.slice(inicio, fim === -1 ? texto.length : fim + 1);
    if (NEGACAO.test(frase)) continue;
    achados.push({ termo: m[0], frase: frase.trim() });
  }
  return achados;
}

const problemas = [];

function valida(pagina, i, slugsConhecidos) {
  const onde = `página[${i}] "${pagina.slug ?? "?"}"`;
  const p = (msg) => problemas.push(`${onde}: ${msg}`);

  for (const chave of ["slug", "icon", "image", "title", "description", "content"]) {
    if (!pagina[chave]) return p(`falta a chave "${chave}"`);
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(pagina.slug))
    p(`slug fora do padrão kebab-case sem acento: "${pagina.slug}"`);

  if (!ICONES.includes(pagina.icon))
    p(`ícone "${pagina.icon}" não está em components/ui/icon.tsx`);

  if (!existsSync(`public${pagina.image}`))
    p(`capa inexistente: public${pagina.image}`);

  const d = pagina.description.length;
  if (d < 110 || d > 165) p(`description com ${d} caracteres (esperado 110–165)`);

  if (!Array.isArray(pagina.content) || pagina.content.length < 3)
    p(`content precisa ser um array com 3 blocos ou mais`);

  for (const bloco of pagina.content ?? []) {
    for (const [, href] of String(bloco).matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      if (!href.startsWith("/")) continue;
      const rota = href.split("#")[0];
      const irmao = /^\/novidades\/([a-z0-9-]+)$/.exec(rota);
      if (irmao) {
        if (!slugsConhecidos.has(irmao[1]))
          p(`link para página irmã que não existe: ${rota}`);
      } else if (!ROTAS.includes(rota)) {
        p(`link interno para rota inexistente: ${rota}`);
      }
    }
  }

  for (const { termo, frase } of afirmaOQueNaoTem(
    `${pagina.content.join(" ")} ${pagina.title} ${pagina.description}`,
  )) {
    p(`parece AFIRMAR "${termo}", sem negação na frase: "${frase}"`);
  }
}

async function main() {
  carregaEnv();

  const paginas = JSON.parse(
    readFileSync(new URL("./conteudo/novidades.json", import.meta.url), "utf8"),
  );

  const slugs = new Set(paginas.map((p) => p.slug));
  if (slugs.size !== paginas.length) problemas.push("há slug repetido na lista");
  paginas.forEach((pagina, i) => valida(pagina, i, slugs));

  if (problemas.length) {
    console.error("A carga foi RECUSADA — nada foi escrito:\n");
    for (const p of problemas) console.error(`  ✗ ${p}`);
    process.exitCode = 1;
    return;
  }

  console.log(`${paginas.length} páginas, todas válidas`);
  for (const p of paginas) console.log(`  ${p.icon.padEnd(16)} ${p.title}`);

  if (DRY) {
    console.log("\n--dry-run: nada foi escrito.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    for (const [i, pagina] of paginas.entries()) {
      const dados = {
        icon: pagina.icon,
        image: pagina.image,
        title: { pt: pagina.title },
        description: { pt: pagina.description },
        content: { pt: pagina.content },
        order: i,
        published: true,
      };
      await prisma.information.upsert({
        where: { slug: pagina.slug },
        update: dados,
        create: { slug: pagina.slug, ...dados },
      });
    }
    console.log("\nPáginas importadas.");
  } finally {
    await prisma.$disconnect();
  }
}

main();
