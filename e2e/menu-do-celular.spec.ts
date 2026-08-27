import { expect, test } from "@playwright/test";

/**
 * O menu do celular, que até hoje nenhum teste tinha aberto.
 *
 * `playwright.config.ts` tinha um projeto só, `Desktop Chrome`. Todo o bloco
 * `md:hidden` do cabeçalho ficava fora de qualquer suíte — e é por onde entra a
 * maior parte de quem procura um restaurante.
 *
 * Os quatro pontos abaixo são o que a dimensão nova encontrou de imediato.
 * Nenhum deles aparece em `npm run build`, `typecheck` ou `lint`.
 */

// Só faz sentido no viewport onde o menu existe.
test.skip(({ isMobile }) => !isMobile, "o menu do hambúrguer só existe no celular");

// O rótulo do botão alterna entre "Abrir menu" e "Fechar menu", então localizá-lo
// por um dos dois deixa de funcionar assim que ele é clicado.
const alternador = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /^(Abrir|Fechar) menu$/ });

const abrir = async (page: import("@playwright/test").Page) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const botao = alternador(page);
  await botao.click();
  await expect(botao).toHaveAttribute("aria-expanded", "true");
  return botao;
};

test("o painel é um marco de navegação", async ({ page }) => {
  // No desktop existe `<nav aria-label>`; no celular eram `<Link>` soltos
  // dentro de um `<div>`. Quem navega por marcos perdia a navegação inteira.
  await abrir(page);
  // `:visible` porque o `<nav>` do desktop continua no DOM, escondido por CSS —
  // quem navega por marcos no celular não deve encontrar aquele, e sim este.
  const navs = page.locator("header nav:visible");
  await expect(navs).toHaveCount(1);
  await expect(navs.first()).toHaveAttribute("aria-label", /.+/);
});

test("o botão aponta para o painel, e o painel existe", async ({ page }) => {
  const botao = await abrir(page);
  const alvo = await botao.getAttribute("aria-controls");
  expect(alvo, "o botão do menu não declara aria-controls").toBeTruthy();
  // Uma relação declarada para um id inexistente é pior que nenhuma: o leitor
  // de tela anuncia um vínculo quebrado.
  await expect(page.locator(`#${alvo}`)).toBeVisible();
});

test("Escape fecha o menu e devolve o foco ao botão", async ({ page }) => {
  const botao = await abrir(page);
  await expect(botao).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");

  await expect(botao, "o menu continuou aberto depois do Escape").toHaveAttribute(
    "aria-expanded",
    "false",
  );
  // Fechar sem devolver o foco deixa a pessoa no `<body>`, sem pista de onde
  // estava.
  await expect(botao).toBeFocused();
});

/*
 * O quarto ponto — o botão de submenu com o mesmo nome do link ao lado — vive
 * em `test/menu-do-celular.test.tsx`, e não aqui.
 *
 * Não é preferência: os submenus vêm das categorias do cardápio, e o banco
 * local do Prato está com schema aplicado e ZERO conteúdo (o cliente ainda não
 * cadastrou nada pelo painel). Um teste de navegador para isso passaria vazio,
 * sem submenu nenhum para inspecionar — exatamente o tipo de teste que este
 * projeto passou a semana caçando. Com props injetadas a verificação é
 * determinística e roda em qualquer máquina.
 */
