-- Cardápio digital: o prato ganha seção, dias e descrição longa.
--
-- ⚠️ O SQL que o Prisma gerou sozinho fazia `DROP COLUMN "weekday"` e perdia o
-- dado. O banco está vazio hoje, mas esta migração roda em produção quando o
-- cliente já tiver cadastrado o cardápio — e uma migração que descarta em
-- silêncio é a que ninguém revisa duas vezes. Aqui o valor é copiado antes.
--
-- A tradução do modelo antigo para o novo:
--   weekday = NULL  →  weekdays = {}     (prato permanente, servido todo dia)
--   weekday = N     →  weekdays = {N}    (o mesmo dia, agora numa lista)

-- CreateEnum
CREATE TYPE "MenuItemKind" AS ENUM ('BUFFET', 'PASTA', 'SHOWCASE');

-- AlterTable: as colunas novas entram primeiro, com o padrão de "permanente".
ALTER TABLE "menu_items"
  ADD COLUMN "descriptionLong" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "kind" "MenuItemKind" NOT NULL DEFAULT 'BUFFET',
  ADD COLUMN "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- Copia o dia único para a lista. `NULL` já corresponde ao padrão `{}`.
UPDATE "menu_items"
   SET "weekdays" = ARRAY["weekday"]
 WHERE "weekday" IS NOT NULL;

-- Só então a coluna antiga sai.
ALTER TABLE "menu_items" DROP COLUMN "weekday";
