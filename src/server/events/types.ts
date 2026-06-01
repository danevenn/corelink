// Tipos del bus de eventos en tiempo real (Fase 7a).
//
// Estos tipos son la FUENTE DE VERDAD del transporte tiempo-real de CoreLink y
// están diseñados para ser GENÉRICOS: la Fase 7 (notificaciones) introduce
// `"notification"`, y la Fase 8 (mensajería) añadirá `"message"` y `"typing"`
// reutilizando esta misma infraestructura (bus + endpoint SSE) sin duplicarla.
//
// Principio de diseño del PAYLOAD: PEQUEÑO. El transporte (Postgres
// LISTEN/NOTIFY) tiene un límite práctico de ~8000 bytes por NOTIFY. Por eso
// los eventos llevan solo IDs + tipo + mínimos datos para que el cliente decida
// si refetchear los detalles (p.ej. `getNotifications`). Nunca metas objetos
// grandes (contenido completo de posts, listas, etc.) en un AppEvent.

import type { NotificationType } from "@/generated/prisma/enums";

/**
 * Evento de notificación nueva para el destinatario.
 * Lleva lo mínimo para que la UI reaccione (incrementar contador, refetchear la
 * lista). El detalle enriquecido se obtiene con `getNotifications`.
 */
export type NotificationEvent = {
  type: "notification";
  /** Id de la Notification recién creada. */
  notificationId: string;
  /** Tipo de notificación (REPLY | MENTION | REACTION | FOLLOW | OFFICIAL_POST). */
  notificationType: NotificationType;
  /** Id del actor que originó la notificación. */
  actorId: string;
  /** Post relacionado, si aplica (REPLY/REACTION/MENTION/OFFICIAL_POST). */
  postId: string | null;
  /** Epoch ms de creación, para ordenación optimista en cliente. */
  createdAt: number;
};

/**
 * Unión discriminada por `type` de todos los eventos que viajan por el bus.
 * Para añadir un nuevo tipo (Fase 8): define su tipo aquí y agrégalo a la unión.
 * El endpoint SSE y los consumidores hacen narrowing por `event.type`.
 */
export type AppEvent = NotificationEvent;

/** Tipo discriminante de un AppEvent (útil para `switch`/SSE `event:`). */
export type AppEventType = AppEvent["type"];

/** Handler local suscrito a los eventos de un usuario. */
export type EventHandler = (event: AppEvent) => void;

/** Función devuelta por `subscribe` que cancela la suscripción. */
export type Unsubscribe = () => void;

/**
 * Interfaz pub/sub por usuario. Implementaciones posibles: en memoria (tests),
 * Postgres LISTEN/NOTIFY (actual), Redis pub/sub (futuro multi-instancia).
 *
 * Contrato:
 *   - `publish` entrega el evento a TODOS los suscriptores del `userId`,
 *     potencialmente en otros procesos/instancias (de ahí LISTEN/NOTIFY).
 *   - `subscribe` registra un handler local y devuelve su `Unsubscribe`.
 */
export interface EventBus {
  publish(userId: string, event: AppEvent): Promise<void>;
  subscribe(userId: string, handler: EventHandler): Unsubscribe;
}

// ── Forma del payload que viaja por el canal de transporte ──────────────────

/** Sobre serializado que se envía por `pg_notify` (y se parsea al recibir). */
export type EventEnvelope = {
  userId: string;
  event: AppEvent;
};
