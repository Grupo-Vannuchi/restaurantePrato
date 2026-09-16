/**
 * A porta e o endereço que a suíte de ponta a ponta usa, num lugar só.
 *
 * ⚠️ **A porta local NÃO é 3000, e a razão é grave.** Este repositório é fork do
 * site pronto de outro restaurante, e o fork ainda roda nesta máquina — quase
 * sempre na 3000. Rotas, componentes, cabeçalho, rodapé, cardápio, galeria e
 * reservas são os MESMOS, porque é isso que se quis reaproveitar; o que difere é
 * dado de cliente. Com o `webServer` apontado para a 3000 e
 * `reuseExistingServer`, um `npm run test:e2e` sem `E2E_BASE_URL` reusava o
 * servidor do vizinho e media o site DELE — e boa parte das asserções passa
 * contra ele, porque o DOM é o mesmo. Ficou aberto até 16/09.
 *
 * ⚠️ **Existe como módulo porque eram TRÊS lugares a concordar, e o terceiro
 * escapou da primeira correção.** `playwright.config.ts` tinha a literal duas
 * vezes (`baseURL` e `webServer.url`) e `e2e/semeia-cardapio.ts` uma terceira,
 * noutro arquivo — a guarda que eu havia escrito lia só a configuração e não a
 * viu. É o mesmo formato de defeito que este projeto já pagou três vezes: o
 * `NavKey` com o `pt.json` e as pastas de rota, o `quality` com o
 * `images.qualities`, o `og:image` com o `openGraph` do segmento. Dois lugares
 * que precisam concordar e nada que cobre.
 *
 * **No CI a porta continua 3000 de propósito:** lá o executor é isolado, não
 * existe projeto irmão, e `NEXT_PUBLIC_SITE_URL` está fixado naquele endereço —
 * mover a porta obrigaria a mover a variável junto, por zero ganho.
 *
 * A porta resolve o caso do vizinho e só ele. Um `E2E_BASE_URL` apontado para o
 * endereço errado passa por fora dela, e é justamente assim que se mira um site
 * publicado — a defesa que vale para os dois casos é
 * `e2e/e-o-site-deste-cliente.setup.ts`.
 */
export const PORTA = process.env.E2E_PORT ?? (process.env.CI ? "3000" : "3200");

/** O endereço do servidor local, montado da porta acima. */
export const LOCAL = `http://localhost:${PORTA}`;

/**
 * O que a suíte vai medir: o site publicado, se houver `E2E_BASE_URL`, senão o
 * servidor local.
 */
export const ALVO = process.env.E2E_BASE_URL ?? LOCAL;
