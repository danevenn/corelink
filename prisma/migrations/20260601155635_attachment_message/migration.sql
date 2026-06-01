-- Fase 9a: Attachment polimórfico (post O mensaje) + columna `key` para borrar
-- del storage + width/height opcionales.
--
-- IMPORTANTE (FTS): esta migración se ESCRIBIÓ A MANO a partir del diff de
-- Prisma para PRESERVAR las columnas `search_vector` (tsvector) y sus índices
-- GIN (`post_search_vector_idx`, `profile_search_vector_idx`) creados en la
-- migración `fulltext_search`. Prisma quería DROPearlas (no las modela); aquí
-- NO se tocan. No añadir ningún DROP COLUMN search_vector.

-- ── Attachment: postId pasa a opcional ───────────────────────────────────────
ALTER TABLE "attachment" ALTER COLUMN "postId" DROP NOT NULL;

-- ── Nuevas columnas ──────────────────────────────────────────────────────────
-- `key` es NOT NULL; la tabla está vacía en este punto (0 filas), así que no
-- hace falta DEFAULT/backfill.
ALTER TABLE "attachment" ADD COLUMN "messageId" TEXT;
ALTER TABLE "attachment" ADD COLUMN "key" TEXT NOT NULL;
ALTER TABLE "attachment" ADD COLUMN "width" INTEGER;
ALTER TABLE "attachment" ADD COLUMN "height" INTEGER;

-- ── Índice por messageId ─────────────────────────────────────────────────────
CREATE INDEX "attachment_messageId_idx" ON "attachment"("messageId");

-- ── FK a message (cascade al borrar el mensaje) ──────────────────────────────
ALTER TABLE "attachment"
  ADD CONSTRAINT "attachment_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "message"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Integridad polimórfica: EXACTAMENTE uno de postId/messageId ──────────────
-- XOR: (post_id IS NOT NULL) <> (message_id IS NOT NULL). Impide adjuntos
-- huérfanos (ambos null) y ambiguos (ambos set) a nivel de base de datos.
ALTER TABLE "attachment"
  ADD CONSTRAINT "attachment_owner_xor"
  CHECK (("postId" IS NOT NULL) <> ("messageId" IS NOT NULL));
