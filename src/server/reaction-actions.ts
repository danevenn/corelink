"use server";

// Server Actions de reacciones (Fase 5a).
//
// Mismo contrato `ActionResult<T>` que `post-actions.ts`: nunca se lanza una
// excepción para el flujo normal; los errores inesperados se devuelven como
// `{ ok: false }` con mensaje genérico.
//
// `toggleReaction` es idempotente y seguro ante carreras: si el viewer ya tiene
// la reacción (userId+postId+type) la borra; si no, la crea. El unique
// constraint (userId, postId, type) garantiza que no haya duplicados aunque
// dos peticiones lleguen a la vez — el create perdedor lanza P2002 y se trata
// como "ya existía".

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NotificationType } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleReactionSchema } from "@/lib/validations/reaction";
import { getPostReactionState, type PostReactionState } from "./posts";

// ── Contrato de resultado (idéntico a post-actions) ─────────────────────────

export type ActionError = {
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

// Estado resultante del post tras el toggle, para que la UI confirme.
export type ToggleReactionResult = PostReactionState;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getViewerIdOrNull(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

const FEED_PATH = "/feed";

function revalidateFeed(postId?: string | null): void {
  revalidatePath(FEED_PATH);
  if (postId) {
    revalidatePath(`${FEED_PATH}/${postId}`);
  }
}

// Prisma 7: el error de unique-violation expone `code === "P2002"`.
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

// ── Acción ──────────────────────────────────────────────────────────────────

/**
 * Alterna una reacción del viewer sobre un post.
 *
 * - Si NO existe (userId+postId+type): la crea y notifica al autor (salvo a
 *   uno mismo) con una Notification REACTION.
 * - Si YA existe: la borra (no genera notificación).
 *
 * Devuelve el estado de reacciones resultante del post (`reactionsByType`,
 * `reactionsTotal`, `viewerReaction[]`) para que la UI lo confirme.
 */
export async function toggleReaction(
  input: unknown,
): Promise<ActionResult<ToggleReactionResult>> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = toggleReactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }
  const { postId, type } = parsed.data;

  try {
    // El post debe existir; de paso obtenemos su autor para la notificación.
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, parentId: true },
    });
    if (!post) {
      return { ok: false, error: { message: "El post no existe." } };
    }

    // Intento de borrado idempotente: deleteMany no falla si no hay fila.
    const deleted = await prisma.reaction.deleteMany({
      where: { userId: viewerId, postId, type },
    });

    if (deleted.count === 0) {
      // No existía → crear. Manejamos P2002 por si una petición concurrente la
      // creó justo entre el deleteMany y el create: en ese caso ya está puesta.
      try {
        await prisma.reaction.create({
          data: { userId: viewerId, postId, type },
        });

        // Notificación al autor (no a uno mismo). Best-effort: si falla, no
        // tumbamos la reacción ya persistida.
        if (post.authorId !== viewerId) {
          try {
            await prisma.notification.create({
              data: {
                userId: post.authorId,
                actorId: viewerId,
                type: NotificationType.REACTION,
                postId,
              },
            });
          } catch {
            // Notificación es secundaria; se ignora su fallo.
          }
        }
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
        // Carrera: la reacción ya existe, estado final coherente. Seguimos.
      }
    }

    const state = await getPostReactionState(postId, viewerId);
    revalidateFeed(post.parentId ?? post.id);
    return { ok: true, data: state };
  } catch {
    return {
      ok: false,
      error: {
        message: "No se pudo procesar la reacción. Inténtalo de nuevo.",
      },
    };
  }
}
