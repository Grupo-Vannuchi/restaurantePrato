# Marca — Restaurante Prato

A logo foi entregue em 09/09/2026, como um PNG de 2000x2000 com o conjunto
empilhado na vertical: cozinheiro em cima, "Prato" no meio, "Restaurante e
Café" embaixo.

Deste arquivo saíram as peças que o site usa:

| Arquivo | O que é | Onde aparece |
|---|---|---|
| `logo.png` | o conjunto inteiro | rodapé |
| `logo-claro.png` | o mesmo, com o nome tingido de branco | abertura do cardápio, sobre véu escuro |
| `wordmark.png` | só o nome | cabeçalho — o conjunto vertical seria ilegível em 64 px de faixa |
| `wordmark-claro.png` | o nome em branco | cartão de compartilhamento |
| `symbol.png` | só o cozinheiro | ícone do iPhone, em 180 px |

⚠️ **O fundo branco do original virou transparência com DUAS regras, e a
diferença é do desenho.** No cozinheiro há branco que é arte — chapéu, jaleco,
brilho da cúpula —, então só o branco alcançável a partir da borda saiu, por
inundação. No nome não há branco de propósito: são letras verdes maciças, e o
vazado do "o" e do "a" é fundo que a inundação nunca alcança, porque a letra o
cerca. Ali todo branco saiu. Com uma regra só, ou o cozinheiro perdia o chapéu
ou as letras ficavam com miolo branco sobre o rodapé colorido.

⚠️ **A versão clara não é o conjunto tingido de branco.** Só o nome é. Tingir
tudo transforma o cozinheiro num borrão sem rosto — conferido lado a lado sobre
fundo escuro antes de escolher. O chapéu e o jaleco já são claros, então ele lê
sobre escuro sem ajuste.

⚠️ **O favicon é a CÚPULA, não o cozinheiro inteiro.** Aba de navegador desenha
em 16 e 32 px, e nesses tamanhos o cozinheiro vira mancha: conferido ampliando
16, 32, 48 e 64. A cúpula sobrevive como silhueta em 16 e lê em 32. O campo é
quase-preto porque nos dois verdes da paleta o jaleco e a cúpula se dissolvem no
fundo, e porque ícone claro chapado desaparece na tela inicial do telefone.

Os arquivos vivem em `src/app/icon.png` e `src/app/apple-icon.png` — arquivo
estático, e não rota gerada: o Next 16 aceita os dois, e arquivo dispensa
renderizar no build.

**Falta ainda o vetor.** O que chegou é PNG rasterizado; para material impresso
e para escalar sem perda, o original em `.ai`, `.eps`, `.svg` ou `.cdr` continua
pendente com quem desenhou.

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
