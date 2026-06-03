-- Fase mentions: Mention POLIMÓRFICO (post O mensaje), análogo al Attachment
-- polimórfico de la Fase 9a. Una mención pertenece a EXACTAMENTE uno de un Post
-- o un Message.
--
-- IMPORTANTE (FTS): esta migración se ESCRIBIÓ A MANO a partir del diff de
-- Prisma (`prisma migrate diff`) para PRESERVAR las columnas `search_vector`
-- (tsvector) y sus índices GIN (`post_search_vector_idx`,
-- `profile_search_vector_idx`) creados en la migración `fulltext_search`.
-- Prisma quería DROPearlas (no las modela); aquí NO se tocan. Se han ELIMINADO
-- a propósito del diff los siguientes statements que Prisma generaba:
--   DROP INDEX "post_search_vector_idx";
--   DROP INDEX "profile_search_vector_idx";
--   ALTER TABLE "post"    DROP COLUMN "search_vector";
--   ALTER TABLE "profile" DROP COLUMN "search_vector";
-- NO añadir ningún DROP de search_vector / sus índices.

-- ── Mention: postId pasa a opcional + nueva FK polimórfica a message ──────────
-- El antiguo unique total (postId, mentionedUserId) se sustituye por dos
-- índices únicos PARCIALES (uno por caso) más abajo.
DROP INDEX "mention_postId_mentionedUserId_key";

ALTER TABLE "mention" ADD COLUMN "messageId" TEXT;
ALTER TABLE "mention" ALTER COLUMN "postId" DROP NOT NULL;

-- ── Índices por FK ───────────────────────────────────────────────────────────
CREATE INDEX "mention_postId_idx" ON "mention"("postId");
CREATE INDEX "mention_messageId_idx" ON "mention"("messageId");

-- ── FK a message (cascade al borrar el mensaje) ──────────────────────────────
ALTER TABLE "mention"
  ADD CONSTRAINT "mention_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "message"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Unicidad por caso: índices únicos PARCIALES ──────────────────────────────
-- Prisma no expresa índices únicos parciales (@@unique genera índices totales,
-- que con columnas nullable no modelan bien "una mención única por
-- (post, usuario)" y "por (mensaje, usuario)" sin colisionar con los NULL del
-- otro caso). Los creamos a mano:
--   - No repetir mención del mismo usuario en el mismo post.
--   - No repetir mención del mismo usuario en el mismo mensaje.
CREATE UNIQUE INDEX "mention_postId_mentionedUserId_key"
  ON "mention"("postId", "mentionedUserId")
  WHERE "postId" IS NOT NULL;

CREATE UNIQUE INDEX "mention_messageId_mentionedUserId_key"
  ON "mention"("messageId", "mentionedUserId")
  WHERE "messageId" IS NOT NULL;

-- ── Integridad polimórfica: EXACTAMENTE uno de postId/messageId ──────────────
-- XOR: (post_id IS NOT NULL) <> (message_id IS NOT NULL). Impide menciones
-- huérfanas (ambos null) y ambiguas (ambos set) a nivel de base de datos.
ALTER TABLE "mention"
  ADD CONSTRAINT "mention_target_xor"
  CHECK (("postId" IS NOT NULL) <> ("messageId" IS NOT NULL));
