-- Fase 10a: archivado lógico de canales.
--
-- Añade `archivedAt` (DateTime nullable) a `channel`: un canal archivado NO se
-- borra (preserva sus posts, cuyo `channelId` es SetNull) y desaparece de la
-- nav/listados normales. null = activo; fecha = momento del archivado.
--
-- IMPORTANTE (FTS): esta migración SOLO toca la tabla `channel`, que NO tiene
-- columna `search_vector`. Aun así, se ESCRIBE A MANO (como en Fases 8a/9a)
-- para garantizar que NO se emite ningún DROP de las columnas `search_vector`
-- (tsvector) ni de sus índices GIN en `post`/`profile`, que Prisma no modela y
-- querría DROPear. Aquí NO se toca nada de post/profile.

-- ── Channel: columna de archivado lógico ─────────────────────────────────────
ALTER TABLE "channel" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- ── Índice por archivedAt (filtrado activo/archivado) ────────────────────────
CREATE INDEX "channel_archivedAt_idx" ON "channel"("archivedAt");
