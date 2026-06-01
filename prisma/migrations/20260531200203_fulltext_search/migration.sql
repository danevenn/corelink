-- Full-text search (Fase 6b) — infraestructura FTS de Postgres.
--
-- Prisma no modela `tsvector` nativamente, así que la columna generada y el
-- índice GIN se crean aquí en SQL crudo. La columna `search_vector` queda
-- INVISIBLE para Prisma (no está en schema.prisma); se consulta vía $queryRaw.
--
-- Config de idioma: 'spanish'. Aplica stemming y stop-words en español, lo
-- ideal para `content` y para campos de perfil escritos en español
-- (displayName, jobTitle, bio). Para los nombres propios el stemming es inocuo
-- y `websearch_to_tsquery('spanish', q)` mantiene la coherencia consulta↔índice.

-- ── Posts: FTS sobre el contenido ──────────────────────────────────────────
ALTER TABLE "post"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', coalesce("content", ''))) STORED;

CREATE INDEX "post_search_vector_idx" ON "post" USING GIN ("search_vector");

-- ── Perfiles: FTS sobre datos públicos del usuario ─────────────────────────
-- Pesos: displayName (A) > jobTitle (B) > bio (C). Permite ordenar por
-- relevancia priorizando coincidencias en el nombre.
ALTER TABLE "profile"
  ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('spanish', coalesce("displayName", '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce("jobTitle", '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce("bio", '')), 'C')
  ) STORED;

CREATE INDEX "profile_search_vector_idx" ON "profile" USING GIN ("search_vector");
