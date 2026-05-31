// Capa de lectura del feed (Fase 4a) — server-only.
//
// Funciones tipadas que devuelven datos LISTOS para la UI: autor, conteos de
// respuestas, desglose de reacciones por tipo, si el usuario actual ha
// reaccionado, canal, flags. La UI las consume sin adivinar la forma.
//
// Estrategia anti-N+1:
//   - Autor + perfil: `include` anidado (1 join), nunca por-fila.
//   - Conteo de respuestas: `_count.replies` agregado por Prisma (sin traer filas).
//   - Reacciones: se traen SOLO `{ type, userId }` de cada post en el mismo
//     query (1 join). El desglose por tipo y `viewerReaction` se calculan en
//     memoria sobre ese array acotado. Cero queries adicionales por post.

import { headers } from "next/headers";
import type { ReactionType } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ── Tipos de retorno (fuente de verdad para la UI) ──────────────────────────

export type FeedAuthor = {
  id: string;
  /** Para enlazar al perfil (no hay username en el modelo; usamos email). */
  email: string;
  displayName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
};

export type FeedChannel = {
  id: string;
  name: string;
  slug: string;
} | null;

/** Conteo por cada tipo de reacción. Siempre presentes todas las claves. */
export type ReactionBreakdown = Record<ReactionType, number>;

export type PostWithMeta = {
  id: string;
  content: string;
  isOfficial: boolean;
  createdAt: Date;
  editedAt: Date | null;
  parentId: string | null;
  author: FeedAuthor;
  channel: FeedChannel;
  /** Respuestas DIRECTAS (hijos por parentId). */
  replyCount: number;
  /** Total de reacciones de cualquier tipo. */
  reactionsTotal: number;
  /** Desglose por tipo (LIKE, CELEBRATE, INSIGHTFUL, SUPPORT). */
  reactionsByType: ReactionBreakdown;
  /**
   * Tipos con los que el usuario ACTUAL ha reaccionado a este post.
   * El modelo permite VARIOS tipos por usuario y post (unique incluye `type`),
   * por eso es un array (vacío si el viewer no ha reaccionado). Fase 5a.
   */
  viewerReaction: ReactionType[];
};

export type FeedPage = {
  posts: PostWithMeta[];
  /** Cursor para la siguiente página (id del último post) o null si no hay más. */
  nextCursor: string | null;
};

export type PostThread = {
  post: PostWithMeta;
  /** Respuestas directas ordenadas por createdAt asc, ya con metadatos. */
  replies: PostWithMeta[];
};

export type ChannelSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: "DEPARTMENT" | "TOPIC";
  postCount: number;
};

// ── Helpers internos ────────────────────────────────────────────────────────

const EMPTY_BREAKDOWN: ReactionBreakdown = {
  LIKE: 0,
  CELEBRATE: 0,
  INSIGHTFUL: 0,
  SUPPORT: 0,
};

// `select` compartido: trae todo lo necesario para `PostWithMeta` en un query.
const postSelect = {
  id: true,
  content: true,
  isOfficial: true,
  createdAt: true,
  editedAt: true,
  parentId: true,
  author: {
    select: {
      id: true,
      email: true,
      profile: {
        select: { displayName: true, avatarUrl: true, jobTitle: true },
      },
    },
  },
  channel: {
    select: { id: true, name: true, slug: true },
  },
  reactions: {
    select: { type: true, userId: true },
  },
  _count: {
    select: { replies: true },
  },
} as const;

type RawPost = {
  id: string;
  content: string;
  isOfficial: boolean;
  createdAt: Date;
  editedAt: Date | null;
  parentId: string | null;
  author: {
    id: string;
    email: string;
    profile: {
      displayName: string;
      avatarUrl: string | null;
      jobTitle: string | null;
    } | null;
  };
  channel: { id: string; name: string; slug: string } | null;
  reactions: { type: ReactionType; userId: string }[];
  _count: { replies: number };
};

// Mapea la fila cruda al tipo de salida, calculando desgloses en memoria.
function toPostWithMeta(raw: RawPost, viewerId: string): PostWithMeta {
  const reactionsByType: ReactionBreakdown = { ...EMPTY_BREAKDOWN };
  const viewerReaction: ReactionType[] = [];

  for (const r of raw.reactions) {
    reactionsByType[r.type] += 1;
    if (r.userId === viewerId) {
      viewerReaction.push(r.type);
    }
  }

  return {
    id: raw.id,
    content: raw.content,
    isOfficial: raw.isOfficial,
    createdAt: raw.createdAt,
    editedAt: raw.editedAt,
    parentId: raw.parentId,
    author: {
      id: raw.author.id,
      email: raw.author.email,
      // Fallback al email si aún no hay Profile (defensivo).
      displayName: raw.author.profile?.displayName ?? raw.author.email,
      avatarUrl: raw.author.profile?.avatarUrl ?? null,
      jobTitle: raw.author.profile?.jobTitle ?? null,
    },
    channel: raw.channel,
    replyCount: raw._count.replies,
    reactionsTotal: raw.reactions.length,
    reactionsByType,
    viewerReaction,
  };
}

// Sesión obligatoria: estas lecturas son del feed interno autenticado.
async function requireViewerId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("No autenticado.");
  }
  return session.user.id;
}

// ── Queries públicas ────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * Feed de posts RAÍZ (parentId null), createdAt desc, paginado por cursor.
 * `channelSlug` filtra por canal. `cursor` = id del último post de la página
 * previa (paginación estable por (createdAt, id)).
 */
export async function getFeed(params?: {
  channelSlug?: string;
  cursor?: string;
  limit?: number;
}): Promise<FeedPage> {
  const viewerId = await requireViewerId();
  const limit = Math.min(
    Math.max(params?.limit ?? DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const rows = (await prisma.post.findMany({
    where: {
      parentId: null,
      ...(params?.channelSlug ? { channel: { slug: params.channelSlug } } : {}),
    },
    select: postSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1, // +1 para saber si hay página siguiente.
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  })) as RawPost[];

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    posts: page.map((r) => toPostWithMeta(r, viewerId)),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

/**
 * Un post + su hilo de respuestas DIRECTAS (createdAt asc), con metadatos.
 * Devuelve null si el post no existe.
 */
export async function getPostById(id: string): Promise<PostThread | null> {
  const viewerId = await requireViewerId();

  const raw = (await prisma.post.findUnique({
    where: { id },
    select: postSelect,
  })) as RawPost | null;

  if (!raw) {
    return null;
  }

  const replyRows = (await prisma.post.findMany({
    where: { parentId: id },
    select: postSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })) as RawPost[];

  return {
    post: toPostWithMeta(raw, viewerId),
    replies: replyRows.map((r) => toPostWithMeta(r, viewerId)),
  };
}

/**
 * Canales para la navegación lateral, con su conteo de posts raíz.
 * Ordenados: departamentos primero, luego temas, alfabético dentro de cada uno.
 */
export async function getChannels(): Promise<ChannelSummary[]> {
  await requireViewerId();

  const channels = await prisma.channel.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      type: true,
      _count: { select: { posts: { where: { parentId: null } } } },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return channels.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    type: c.type,
    postCount: c._count.posts,
  }));
}

// ── Feed personalizado (Fase 5a) ────────────────────────────────────────────

/**
 * Feed de posts RAÍZ de los usuarios que el viewer SIGUE (más, por defecto, los
 * suyos propios, para que el feed nunca quede vacío al empezar a seguir gente).
 * Misma forma `FeedPage`/`PostWithMeta` que `getFeed`: la UI lo consume igual.
 *
 * Anti-N+1: una sola query a `follow` para resolver los ids seguidos, y luego
 * el mismo `postSelect` compartido con `authorId in (...)`. Cero queries por fila.
 */
export async function getFollowingFeed(params?: {
  cursor?: string;
  limit?: number;
  /** Incluir también los posts propios del viewer (default true). */
  includeOwn?: boolean;
}): Promise<FeedPage> {
  const viewerId = await requireViewerId();
  const limit = Math.min(
    Math.max(params?.limit ?? DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );
  const includeOwn = params?.includeOwn ?? true;

  // 1 query: ids a los que sigue el viewer.
  const followed = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });

  const authorIds = followed.map((f) => f.followingId);
  if (includeOwn) {
    authorIds.push(viewerId);
  }

  // Sin seguidos (ni propios): feed vacío sin tocar `post`.
  if (authorIds.length === 0) {
    return { posts: [], nextCursor: null };
  }

  const rows = (await prisma.post.findMany({
    where: {
      parentId: null,
      authorId: { in: authorIds },
    },
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

// ── Estado de follow para perfiles/cards (Fase 5a) ──────────────────────────

export type FollowState = {
  targetUserId: string;
  /** ¿El viewer sigue a este usuario? */
  isFollowing: boolean;
  /** Nº de seguidores del usuario objetivo. */
  followerCount: number;
  /** Nº de usuarios a los que el objetivo sigue. */
  followingCount: number;
  /** El propio usuario (no se puede seguir a uno mismo). */
  isSelf: boolean;
};

/**
 * Estado de seguimiento del viewer respecto a `targetUserId`, más los conteos
 * de seguidores/seguidos del objetivo. Para cards de perfil y botones de follow.
 */
export async function getFollowState(
  targetUserId: string,
): Promise<FollowState> {
  const viewerId = await requireViewerId();
  const isSelf = viewerId === targetUserId;

  const [followerCount, followingCount, existing] = await Promise.all([
    prisma.follow.count({ where: { followingId: targetUserId } }),
    prisma.follow.count({ where: { followerId: targetUserId } }),
    isSelf
      ? Promise.resolve(null)
      : prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId,
              followingId: targetUserId,
            },
          },
          select: { id: true },
        }),
  ]);

  return {
    targetUserId,
    isFollowing: existing !== null,
    followerCount,
    followingCount,
    isSelf,
  };
}

// ── Estado de reacciones de un post (Fase 5a) ───────────────────────────────

/**
 * Estado de reacciones de UN post, listo para que la UI confirme un toggle:
 * desglose por tipo, total y los tipos puestos por `viewerId`. Calculado en
 * memoria sobre un único `select` acotado (`{ type, userId }`), sin N+1.
 * Reutilizado por `toggleReaction` para devolver el estado resultante.
 */
export async function getPostReactionState(
  postId: string,
  viewerId: string,
): Promise<{
  postId: string;
  reactionsByType: ReactionBreakdown;
  reactionsTotal: number;
  viewerReaction: ReactionType[];
}> {
  const reactions = await prisma.reaction.findMany({
    where: { postId },
    select: { type: true, userId: true },
  });

  const reactionsByType: ReactionBreakdown = { ...EMPTY_BREAKDOWN };
  const viewerReaction: ReactionType[] = [];
  for (const r of reactions) {
    reactionsByType[r.type] += 1;
    if (r.userId === viewerId) {
      viewerReaction.push(r.type);
    }
  }

  return {
    postId,
    reactionsByType,
    reactionsTotal: reactions.length,
    viewerReaction,
  };
}

export type PostReactionState = Awaited<
  ReturnType<typeof getPostReactionState>
>;
