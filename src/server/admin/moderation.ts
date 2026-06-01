// Capa de lectura de MODERACIÓN (Fase 10a) — server-only, solo STAFF.
//
// Alimenta el panel de moderación con el contenido reciente a revisar. A
// diferencia del feed normal (`getFeed`, solo posts raíz), aquí se incluyen
// TANTO posts raíz COMO respuestas, porque la moderación retira cualquiera de
// los dos (ver `deletePost`, que ya permite a staff borrar ambos).
//
// Reutiliza `postSelect`/`toPostWithMeta`/`FeedPage` del feed (anti-N+1) y
// `requireModerator()` para la autorización por rol (admin o moderator).

import { prisma } from "@/lib/db";
import { type AuthzDenied, requireModerator } from "@/server/authz";
import {
  type FeedPage,
  postSelect,
  type RawPost,
  toPostWithMeta,
} from "@/server/posts";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

/**
 * Contenido reciente (posts raíz + respuestas), createdAt desc, paginado por
 * cursor. Solo STAFF. Devuelve un `AuthzDenied` serializable si el viewer no es
 * staff (mismo contrato que las actions de moderación), o un `FeedPage`.
 */
export async function listRecentPosts(params?: {
  cursor?: string;
  limit?: number;
}): Promise<FeedPage | AuthzDenied> {
  const gate = await requireModerator();
  if (!("id" in gate)) return gate;
  const viewerId = gate.id;

  const limit = Math.min(
    Math.max(params?.limit ?? DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const rows = (await prisma.post.findMany({
    // Sin filtro por parentId: la moderación ve raíces Y respuestas.
    select: postSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  })) as RawPost[];

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    posts: page.map((r) => toPostWithMeta(r, viewerId)),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}
