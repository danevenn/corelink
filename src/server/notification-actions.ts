"use server";

// Server Actions de notificaciones (Fase 7a).
//
// Contrato consistente con `post-actions.ts`: resultado serializable
// `ActionResult<T>`; nunca se lanza para el flujo normal.
//
// Autorización a nivel de query: el WHERE incluye SIEMPRE `userId: viewerId`,
// de modo que un usuario solo puede marcar como leídas SUS propias
// notificaciones, aunque pase ids ajenos (simplemente no coinciden).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { markReadSchema } from "@/lib/validations/notification";
import type { ActionResult } from "@/server/action-result";
import {
  getNotifications,
  getUnreadCount,
  type NotificationsPage,
} from "@/server/notifications";
import { getViewerIdOrNull } from "@/server/session";

export type MarkReadResult = {
  /** Nº de notificaciones marcadas como leídas en esta operación. */
  updated: number;
};

/**
 * Marca notificaciones como leídas.
 *
 * - Sin `ids` (o array vacío): marca TODAS las no leídas del usuario.
 * - Con `ids`: marca solo esas, y solo si son del usuario (filtro por userId).
 *
 * Solo toca filas no leídas (`read: false`) para que `updated` refleje el
 * cambio real. Revalida `/feed` (donde vive la campana) tras la mutación.
 */
export async function markNotificationsRead(
  ids?: string[],
): Promise<ActionResult<MarkReadResult>> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = markReadSchema.safeParse({ ids });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const list = parsed.data.ids;
  const hasIds = Array.isArray(list) && list.length > 0;

  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: viewerId,
        read: false,
        ...(hasIds ? { id: { in: list } } : {}),
      },
      data: { read: true },
    });

    revalidatePath("/feed");
    return { ok: true, data: { updated: result.count } };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudieron marcar las notificaciones." },
    };
  }
}

/**
 * Wrapper `"use server"` de la query `getNotifications` para que el desplegable
 * (client island) pueda RE-FETCHEAR la lista al abrirse o al llegar un evento
 * SSE. La query en sí vive en `notifications.ts`; aquí sólo la exponemos como
 * acción invocable desde el cliente (no reescribe lógica de datos).
 */
export async function fetchNotificationsPage(args?: {
  cursor?: string;
  limit?: number;
}): Promise<NotificationsPage> {
  return getNotifications(args);
}

/** Wrapper `"use server"` de `getUnreadCount` para refrescos en cliente. */
export async function fetchUnreadCount(): Promise<number> {
  return getUnreadCount();
}
