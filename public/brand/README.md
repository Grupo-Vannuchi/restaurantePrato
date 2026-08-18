# Marca — Restaurante Prato

⚠️ **Vazio de propósito.** A logo do Restaurante Prato ainda não foi entregue.

Até ela chegar, a marca é **tipográfica**: `src/components/layout/logo.tsx`
desenha `siteConfig.name` na Playfair Display, que o site já carrega via
`next/font` para os títulos. As rotas de imagem (`src/app/icon.tsx`,
`apple-icon.tsx`, `[locale]/opengraph-image.tsx`) compõem com texto sobre o fundo
escuro da marca.

Os arquivos do cliente anterior foram removidos junto com o script
`brand:rasters` que os rasterizava — publicar a marca de outra empresa no site
deste cliente não é opção, nem em ambiente fechado.

## Quando a logo chegar (PR 2)

1. Colocar os SVG aqui e documentar cada corte nesta tabela.
2. `satori` — que gera `icon`, `apple-icon` e `opengraph-image` — **não resolve
   `url(#gradiente)`**. Se a logo tiver gradiente, essas rotas precisam embutir
   PNG, e o script de raster volta.
3. Um lockup com texto escuro some no fundo escuro: conferir contraste e, se
   preciso, gerar um corte por tema (foi o que o cliente anterior exigiu).
