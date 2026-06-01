// Capa de lectura de perfiles de usuario (Interludio Fase 5) — server-only.
//
// Alimenta la página de perfil `/users/[id]`: datos públicos del usuario + su
// Profile, rol (para badge staff opcional), estado de follow del viewer, y la
// lista de sus posts raíz con la MISMA forma que el feed.
//
// Reutiliza todo lo del feed sin duplicar: `postSelect` (select compartido,
// anti-N+1), `toPostWithMeta` (mapeo a `PostWithMeta`), `FeedPage`,
// `requireViewerId` (sesión obligatoria, igual que el feed) y `getFollowState`.

import type { AppRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  type FeedPage,
  type FollowState,
  getFollowState,
  postSelect,
  type RawPost,
  requireViewerId,
  toPostWithMeta,
} from "@/server/posts";

// ── Tipo de retorno (fuente de verdad para la UI del perfil) ────────────────

/** Departamento del perfil (Channel de tipo DEPARTMENT) o null si no tiene. */
export type ProfileDepartment = {
  name: string;
  slug: string;
} | null;

export type UserProfileView = {
  /** id opaco del User (nanoid de 32 chars). */
  id: string;
  email: string;
  /** Nombre de la cuenta (User.name). */
  name: string;
  /**
   * Nombre mostrado del Profile. Si el usuario no tiene Profile (p. ej.
   * anónimos), cae al `name`/`email` para no romper la UI.
   */
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: ProfileDepartment;
  /** "Miembro desde" — alta de la cuenta. */
  createdAt: Date;
  /** Rol de plataforma, por si la UI quiere badge admin/moderator. */
  role: AppRole;
  /** ¿Usuario invitado/anónimo? Puede no tener Profile. */
  isAnonymous: boolean;
  /** Estado de follow del viewer respecto a este usuario (reutiliza feed). */
  follow: FollowState;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function normalizeRole(raw: string | null | undefined): AppRole {
  if (raw === "admin" || raw === "moderator") return raw;
  return "user";
}

/**
 * Perfil público de un usuario + su Profile + rol + estado de follow del viewer.
 * Devuelve `null` si el usuario no existe. Sesión obligatoria (coherente con el
 * feed: el perfil es contenido interno autenticado).
 *
 * Anti-N+1: un único query trae User + Profile + department (joins anidados);
 * el follow state se resuelve en paralelo con `getFollowState` (conteos + 1 find).
 */
export async function getUserProfile(
  userId: string,
): Promise<UserProfileView | null> {
  // Exige sesión (lanza si no hay), igual que el resto de lecturas del feed.
  await requireViewerId();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isAnonymous: true,
      createdAt: true,
      profile: {
        select: {
          displayName: true,
          bio: true,
          avatarUrl: true,
          jobTitle: true,
          department: {
            select: { name: true, slug: true },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const isAnonymous = user.isAnonymous ?? false;
  // Los anónimos nunca son staff; normalizamos cualquier valor inesperado.
  const role = isAnonymous ? "user" : normalizeRole(user.role);

  // Reutiliza el estado de follow del feed (incluye conteos e isSelf).
  const follow = await getFollowState(userId);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    // Fallback defensivo: un usuario sin Profile (p. ej. anónimo) no rompe.
    displayName: user.profile?.displayName ?? user.name ?? user.email,
    bio: user.profile?.bio ?? null,
    avatarUrl: user.profile?.avatarUrl ?? null,
    jobTitle: user.profile?.jobTitle ?? null,
    department: user.profile?.department ?? null,
    createdAt: user.createdAt,
    role,
    isAnonymous,
    follow,
  };
}

/**
 * Posts RAÍZ (parentId null) cuyo autor es `userId`, createdAt desc, paginados
 * por cursor. Misma forma `FeedPage`/`PostWithMeta` que el feed, reutilizando
 * `postSelect`/`toPostWithMeta` (sin N+1). Sesión obligatoria.
 */
export async function getUserPosts(
  userId: string,
  params?: { cursor?: string; limit?: number },
): Promise<FeedPage> {
  const viewerId = await requireViewerId();
  const limit = Math.min(
    Math.max(params?.limit ?? DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  const rows = (await prisma.post.findMany({
    where: {
      parentId: null,
      authorId: userId,
    },
    select: postSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1, // +1 para detectar si hay página siguiente.
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  })) as RawPost[];

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    posts: page.map((r) => toPostWithMeta(r, viewerId)),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}
