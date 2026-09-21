# Auditoria de SEO da agência — não é deste site

Os dois documentos nesta pasta auditam **`n8xmarketing.com.br`**, o site da
agência N8X de onde este repositório foi forkado duas vezes. Estão datados de
**26/06/2026** e trazem nota **94/100**.

⚠️ **Eles moravam em `docs/seo/` até 21/09/2026, e o problema era exatamente
isso:** quem abria a pasta encontrava "auditoria de SEO" com 94/100 e concluía
que o Restaurante Prato estava auditado. A auditoria deste site é outra, tem
nome próprio e outra nota:

- [`../AUDITORIA-PRATO.md`](../AUDITORIA-PRATO.md) — o estado real, **~92**
- [`../PLANO-DE-ACAO-PRATO.md`](../PLANO-DE-ACAO-PRATO.md) — o que falta

**Por que não foram apagados.** Eles são o registro histórico de um trabalho que
existiu, e `docs/` fica fora da varredura de `test/brand-hygiene.test.ts` de
propósito — os documentos de decisão explicam por que o código tem a forma que
tem. O que não podiam era ocupar o lugar da auditoria deste cliente.

Comparar os dois números é comparar dois sites: outra rubrica, outra data, outro
conteúdo, e um deles aberto aos buscadores.
