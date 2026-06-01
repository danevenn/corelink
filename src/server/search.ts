// Búsqueda full-text (Fase 6b) — server-only.
//
// FTS de Postgres sobre columnas generadas `tsvector` (ver migración
// `…_fulltext_search`): `post.search_vector` y `profile.search_vector`, ambas
// con índice GIN y config de idioma 'spanish'.
//
// Seguridad / inyección:
//   - Solo usuarios autenticados buscan (requireViewerId).
//   - `q` se pasa SIEMPRE como bind parametrizado vía `Prisma.sql` /
//     `$queryRaw` con placeholders. NUNCA se concatena en el SQL.
//   - `q` vacío o solo-espacios → resultados vacíos sin tocar la BD.
//
// Forma de resultados:
//   - searchPosts → `FeedPage` con `PostWithMeta` (reusa `postSelect` /
//     `toPostWithMeta` de `posts.ts`): la UI del feed lo consume igual.
//   - searchUsers → usuarios con id/displayName/avatarUrl/jobTitle/email +
//     estado de follow del viewer (barato: 1 query a `follow`).

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  type FeedPage,
  type PostWithMeta,
  postSelect,
  type RawPost,
  requireViewerId,
  toPostWithMeta,
} from "@/server/posts";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function clampLimit(limit: number | undefined): number {
  return Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
}

/** Normaliza la query: trim. Vacía → null (señal de "sin resultados"). */
function normalizeQuery(q: string): string | null {
  const trimmed = q.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ── Búsqueda de posts ───────────────────────────────────────────────────────

export type SearchPostsResult = FeedPage;

/**
 * Busca en el contenido de los posts (todos, raíz y respuestas) por relevancia
 * (`ts_rank`), de mayor a menor, desempatando por `createdAt` desc. Paginación
 * por cursor basada en offset numérico (el ranking no es estable por id).
 *
 * Estrategia anti-N+1: una query FTS devuelve solo los ids ordenados por rank;
 * luego un único `findMany` con `postSelect` trae los datos completos y se
 * reordena en memoria según el ranking.
 */
export async function searchPosts(
  q: string,
  params?: { cursor?: string; limit?: number },
): Promise<SearchPostsResult> {
  const viewerId = await requireViewerId();
  const query = normalizeQuery(q);
  if (!query) {
    return { posts: [], nextCursor: null };
  }

  const limit = clampLimit(params?.limit);
  // Cursor = offset numérico serializado. Defensivo ante valores no numéricos.
  const offset = (() => {
    const n = Number(params?.cursor ?? 0);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  })();

  // FTS parametrizada: `websearch_to_tsquery` interpreta sintaxis tipo buscador
  // (frases, OR, -exclusión). `q` va como bind, jamás interpolado.
  const ranked = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`
      SELECT "id"
      FROM "post"
      WHERE "search_vector" @@ websearch_to_tsquery('spanish', ${query})
      ORDER BY
        ts_rank("search_vector", websearch_to_tsquery('spanish', ${query})) DESC,
        "createdAt" DESC,
        "id" DESC
      LIMIT ${limit + 1}
      OFFSET ${offset}
    `,
  );

  const hasMore = ranked.length > limit;
  const pageIds = (hasMore ? ranked.slice(0, limit) : ranked).map((r) => r.id);

  if (pageIds.length === 0) {
    return { posts: [], nextCursor: null };
  }

  const rows = (await prisma.post.findMany({
    where: { id: { in: pageIds } },
    select: postSelect,
  })) as RawPost[];

  // Reordenar según el ranking (findMany no garantiza el orden del `in`).
  const byId = new Map(rows.map((r) => [r.id, r] as const));
  const posts: PostWithMeta[] = [];
  for (const id of pageIds) {
    const raw = byId.get(id);
    if (raw) {
      posts.push(toPostWithMeta(raw, viewerId));
    }
  }

  return {
    posts,
    nextCursor: hasMore ? String(offset + limit) : null,
  };
}

// ── Búsqueda de usuarios ────────────────────────────────────────────────────

export type UserSearchResult = {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  /** ¿El viewer sigue a este usuario? false si es el propio viewer. */
  isFollowing: boolean;
  /** El resultado es el propio usuario que busca. */
  isSelf: boolean;
};

/**
 * Busca usuarios por su perfil (displayName/jobTitle/bio) con FTS español y
 * ranking ponderado (displayName pesa más; ver `setweight` en la migración).
 * Incluye el estado de follow del viewer (1 query extra a `follow`, barato).
 */
export async function searchUsers(
  q: string,
  params?: { limit?: number },
): Promise<UserSearchResult[]> {
  const viewerId = await requireViewerId();
  const query = normalizeQuery(q);
  if (!query) {
    return [];
  }

  const limit = clampLimit(params?.limit);

  // FTS sobre `profile.search_vector`, join a `user` para email. `q` bind.
  const rows = await prisma.$queryRaw<
    {
      userId: string;
      email: string;
      displayName: string;
      avatarUrl: string | null;
      jobTitle: string | null;
    }[]
  >(
    Prisma.sql`
      SELECT
        p."userId"      AS "userId",
        u."email"       AS "email",
        p."displayName" AS "displayName",
        p."avatarUrl"   AS "avatarUrl",
        p."jobTitle"    AS "jobTitle"
      FROM "profile" p
      JOIN "user" u ON u."id" = p."userId"
      WHERE p."search_vector" @@ websearch_to_tsquery('spanish', ${query})
      ORDER BY
        ts_rank(p."search_vector", websearch_to_tsquery('spanish', ${query})) DESC,
        p."displayName" ASC
      LIMIT ${limit}
    `,
  );

  if (rows.length === 0) {
    return [];
  }

  // Estado de follow del viewer hacia los usuarios encontrados (1 query).
  const targetIds = rows.map((r) => r.userId).filter((id) => id !== viewerId);
  const followed =
    targetIds.length > 0
      ? await prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: targetIds } },
          select: { followingId: true },
        })
      : [];
  const followingSet = new Set(followed.map((f) => f.followingId));

  return rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    displayName: r.displayName,
    avatarUrl: r.avatarUrl,
    jobTitle: r.jobTitle,
    isFollowing: followingSet.has(r.userId),
    isSelf: r.userId === viewerId,
  }));
}
