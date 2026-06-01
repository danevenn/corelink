"use server";

// Server Actions de posts OFICIALES (Fase 6b).
//
// Decisión de producto: marcar un post como "oficial" NO lo decide el autor,
// sino el STAFF (admin o moderator). Por eso la autorización va por
// `requireModerator()` de `src/server/authz.ts`, no por `authorId`.
//
// Contrato consistente con `src/server/post-actions.ts`: resultado serializable
// `ActionResult<T>` — nunca se lanza para el flujo normal (validación,
// autorización, no encontrado). Errores inesperados → `{ ok: false }` genérico.

import { revalidatePath } from "next/cache";
import { NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { setOfficialSchema } from "@/lib/validations/post";
import { requireModerator } from "@/server/authz";
import { createNotification } from "@/server/notifications";
import type { ActionResult } from "@/server/post-actions";

export type SetOfficialResult = { postId: string; isOfficial: boolean };

const FEED_PATH = "/feed";

/**
 * Marca o desmarca un post como oficial. Solo STAFF (admin o moderator).
 *
 * - Valida input con zod.
 * - Exige `requireModerator()`; usuario normal o anónimo → `{ ok: false }`.
 * - Actualiza `Post.isOfficial`.
 * - Best-effort: si se marca oficial y el actor NO es el autor, crea una
 *   `Notification` OFFICIAL_POST al autor. No bloquea ni revierte la mutación.
 * - Revalida /feed, el hilo del post y la vista del canal (si tiene).
 *
 * Devuelve `{ postId, isOfficial }`.
 */
export async function setPostOfficial(
  postId: string,
  isOfficial: boolean,
): Promise<ActionResult<SetOfficialResult>> {
  // 1) Autorización: solo staff. Sin sesión o rol insuficiente → denegado.
  const gate = await requireModerator();
  if (!("id" in gate)) {
    return gate; // AuthzDenied: { ok: false, error: { message } }
  }

  // 2) Validación de forma.
  const parsed = setOfficialSchema.safeParse({ postId, isOfficial });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  try {
    // 3) Confirmar existencia y recuperar contexto (autor, canal, hilo) en un
    //    único query antes de mutar.
    const target = await prisma.post.findUnique({
      where: { id: parsed.data.postId },
      select: {
        id: true,
        authorId: true,
        parentId: true,
        channel: { select: { slug: true } },
      },
    });

    if (!target) {
      return { ok: false, error: { message: "Post no encontrado." } };
    }

    await prisma.post.update({
      where: { id: target.id },
      data: { isOfficial: parsed.data.isOfficial },
    });

    // 4) Notificación al autor (solo al marcar oficial) + evento tiempo real.
    //    Centralizada en `createNotification`: no auto-notifica y publica al
    //    bus. No bloqueante: la marca oficial ya está aplicada.
    if (parsed.data.isOfficial) {
      await createNotification({
        userId: target.authorId,
        actorId: gate.id,
        type: NotificationType.OFFICIAL_POST,
        postId: target.id,
      });
    }

    // 5) Revalidación: feed, hilo afectado y vista de canal.
    revalidatePath(FEED_PATH);
    revalidatePath(`${FEED_PATH}/${target.parentId ?? target.id}`);
    if (target.channel) {
      revalidatePath(`/channels/${target.channel.slug}`);
    }

    return {
      ok: true,
      data: { postId: target.id, isOfficial: parsed.data.isOfficial },
    };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo actualizar el post." },
    };
  }
}
