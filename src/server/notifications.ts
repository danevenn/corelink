// Capa de notificaciones (Fase 7a) — server-only — creación centralizada + lecturas.
//
// Este módulo es el ÚNICO punto donde se crean notificaciones. Antes, cada
// action (reaction/follow/official) insertaba la `Notification` a mano; ahora
// todas pasan por `createNotification`, que (1) aplica el criterio de dedupe/
// no-auto-notificación y (2) PUBLICA al bus de eventos un `AppEvent` de tipo
// "notification" para el destinatario, de modo que TODAS disparan tiempo real
// (SSE) de forma uniforme. Centralizar aquí garantiza que ningún flujo se
// olvide de notificar al bus.
//
// Las lecturas (`getNotifications`, `getUnreadCount`) devuelven datos LISTOS
// para la UI (actor con displayName/avatar, snippet del post) sin N+1.

import type { NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { eventBus } from "@/server/events/bus";
import { getViewerIdOrNull } from "@/server/session";

// ── Creación centralizada ───────────────────────────────────────────────────

export type CreateNotificationInput = {
  /** Destinatario de la notificación. */
  userId: string;
  /** Quien la origina (autor de la reacción/follow/respuesta...). */
  actorId: string;
  type: NotificationType;
  /** Post relacionado, si aplica. */
  postId?: string | null;
};

/**
 * Crea una notificación y publica el evento de tiempo real al bus.
 *
 * Criterio: NUNCA te notificas a ti mismo (actor === destinatario → no-op).
 * Best-effort por diseño: si la inserción o el publish fallan, NO lanza —
 * la notificación es secundaria y no debe tumbar la acción de dominio que la
 * originó (reaccionar, seguir, responder). Devuelve el id creado o `null`.
 *
 * El publish va DESPUÉS del insert: el evento lleva el `notificationId` real,
 * así el cliente puede refetchear/ubicar la notificación concreta.
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<string | null> {
  // No auto-notificar.
  if (input.userId === input.actorId) return null;

  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        actorId: input.actorId,
        type: input.type,
        postId: input.postId ?? null,
      },
      select: { id: true, type: true, postId: true, createdAt: true },
    });

    // Publicación al bus (best-effort): el destinatario recibe el evento por SSE
    // si tiene una conexión abierta. El payload es mínimo (IDs + tipo).
    try {
      await eventBus.publish(input.userId, {
        type: "notification",
        notificationId: notification.id,
        notificationType: notification.type,
        actorId: input.actorId,
        postId: notification.postId,
        createdAt: notification.createdAt.getTime(),
      });
    } catch {
      // El bus es secundario: la Notification ya está persistida y se verá al
      // refetchear/recargar aunque el evento en vivo no llegue.
    }

    return notification.id;
  } catch {
    // La notificación es secundaria; nunca propaga el fallo a la acción origen.
    return null;
  }
}

// ── Lecturas (datos listos para la UI) ──────────────────────────────────────

export type NotificationActor = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type NotificationPostRef = {
  id: string;
  /** Fragmento corto del contenido del post para mostrar contexto. */
  snippet: string;
} | null;

export type NotificationView = {
  id: string;
  type: NotificationType;
  actor: NotificationActor;
  post: NotificationPostRef;
  read: boolean;
  createdAt: Date;
};

export type NotificationsPage = {
  notifications: NotificationView[];
  /** Cursor (id de la última) para la siguiente página, o null si no hay más. */
  nextCursor: string | null;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const SNIPPET_LEN = 140;

function snippetOf(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= SNIPPET_LEN) return trimmed;
  return `${trimmed.slice(0, SNIPPET_LEN).trimEnd()}…`;
}

/**
 * Notificaciones del usuario actual, `createdAt` desc, enriquecidas para la UI.
 *
 * Anti-N+1: un único query con `include` del actor (su Profile: displayName,
 * avatarUrl) y del post (id + content para el snippet). Paginación por cursor
 * estilo `getFeed` (traemos limit+1 para saber si hay siguiente página).
 *
 * Sin sesión → página vacía (no lanza; la consume server components/UI).
 */
export async function getNotifications(args?: {
  cursor?: string;
  limit?: number;
}): Promise<NotificationsPage> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) return { notifications: [], nextCursor: null };

  const limit = Math.min(args?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const cursor = args?.cursor;

  const rows = await prisma.notification.findMany({
    where: { userId: viewerId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      read: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      post: { select: { id: true, content: true } },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const notifications: NotificationView[] = page.map((row) => ({
    id: row.id,
    type: row.type,
    read: row.read,
    createdAt: row.createdAt,
    actor: {
      id: row.actor.id,
      // Fallback defensivo: un actor sin Profile no debería ocurrir tras seed.
      displayName: row.actor.profile?.displayName ?? "Usuario",
      avatarUrl: row.actor.profile?.avatarUrl ?? null,
    },
    post: row.post
      ? { id: row.post.id, snippet: snippetOf(row.post.content) }
      : null,
  }));

  const nextCursor =
    hasMore && page.length > 0 ? (page[page.length - 1]?.id ?? null) : null;

  return { notifications, nextCursor };
}

/** Nº de notificaciones NO leídas del usuario actual (0 sin sesión). */
export async function getUnreadCount(): Promise<number> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) return 0;
  return prisma.notification.count({
    where: { userId: viewerId, read: false },
  });
}
