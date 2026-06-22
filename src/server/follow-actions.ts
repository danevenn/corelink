"use server";

// Server Actions de follows (Fase 5a).
//
// Mismo contrato `ActionResult<T>` que `post-actions.ts`. Idempotentes y
// seguras ante carreras gracias al unique (followerId, followingId):
//   - followUser: crea el follow; si ya existía (P2002) lo trata como éxito.
//   - unfollowUser: deleteMany; no falla si no había follow.
// Ambas impiden auto-seguirse y exigen sesión.

import { revalidatePath } from "next/cache";
import { NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { followSchema } from "@/lib/validations/follow";
import type { ActionError, ActionResult } from "@/server/action-result";
import { createNotification } from "@/server/notifications";
import { isUniqueViolation } from "@/server/prisma-errors";
import { getViewerIdOrNull } from "@/server/session";

export type FollowResult = {
  targetUserId: string;
  isFollowing: boolean;
  followerCount: number;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const FEED_PATH = "/feed";

// Las acciones de follow cambian el feed personalizado del viewer.
function revalidateFollowing(): void {
  revalidatePath(FEED_PATH);
}

// Valida input + sesión y resuelve el id objetivo, rechazando auto-follow.
async function resolveTarget(
  input: unknown,
): Promise<
  | { ok: true; viewerId: string; targetUserId: string }
  | { ok: false; error: ActionError }
> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = followSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { targetUserId } = parsed.data;
  if (targetUserId === viewerId) {
    return { ok: false, error: { message: "No puedes seguirte a ti mismo." } };
  }

  return { ok: true, viewerId, targetUserId };
}

async function followerCountOf(targetUserId: string): Promise<number> {
  return prisma.follow.count({ where: { followingId: targetUserId } });
}

// ── Acciones ──────────────────────────────────────────────────────────────

/** Sigue a `targetUserId`. Idempotente: seguir dos veces deja un solo follow. */
export async function followUser(
  targetUserId: string,
): Promise<ActionResult<FollowResult>> {
  const resolved = await resolveTarget({ targetUserId });
  if (!resolved.ok) {
    return resolved;
  }

  try {
    // El objetivo debe existir (FK lo garantizaría, pero damos error limpio).
    const target = await prisma.user.findUnique({
      where: { id: resolved.targetUserId },
      select: { id: true },
    });
    if (!target) {
      return { ok: false, error: { message: "El usuario no existe." } };
    }

    try {
      await prisma.follow.create({
        data: {
          followerId: resolved.viewerId,
          followingId: resolved.targetUserId,
        },
      });

      // Notificación FOLLOW + evento en tiempo real, centralizada en
      // `createNotification` (no auto-notifica y publica al bus). Best-effort.
      await createNotification({
        userId: resolved.targetUserId,
        actorId: resolved.viewerId,
        type: NotificationType.FOLLOW,
      });
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      // Ya lo seguía: idempotente, sin re-notificar.
    }

    const followerCount = await followerCountOf(resolved.targetUserId);
    revalidateFollowing();
    return {
      ok: true,
      data: {
        targetUserId: resolved.targetUserId,
        isFollowing: true,
        followerCount,
      },
    };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo seguir al usuario. Inténtalo de nuevo." },
    };
  }
}

/** Deja de seguir a `targetUserId`. Idempotente: no falla si no lo seguía. */
export async function unfollowUser(
  targetUserId: string,
): Promise<ActionResult<FollowResult>> {
  const resolved = await resolveTarget({ targetUserId });
  if (!resolved.ok) {
    return resolved;
  }

  try {
    await prisma.follow.deleteMany({
      where: {
        followerId: resolved.viewerId,
        followingId: resolved.targetUserId,
      },
    });

    const followerCount = await followerCountOf(resolved.targetUserId);
    revalidateFollowing();
    return {
      ok: true,
      data: {
        targetUserId: resolved.targetUserId,
        isFollowing: false,
        followerCount,
      },
    };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo dejar de seguir. Inténtalo de nuevo." },
    };
  }
}
