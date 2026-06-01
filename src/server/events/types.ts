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
 * Evento de mensaje nuevo en una conversación (Fase 8a).
 * Se publica a cada miembro de la conversación MENOS al emisor (el emisor ya
 * tiene el mensaje por el retorno de la action). Payload mínimo: el cliente
 * refetchea el contenido/historial con `getMessages` si lo necesita.
 */
export type MessageEvent = {
  type: "message";
  /** Conversación a la que pertenece el mensaje. */
  conversationId: string;
  /** Id del mensaje recién creado. */
  messageId: string;
  /** Autor del mensaje. */
  senderId: string;
  /** Epoch ms de creación, para ordenación optimista en cliente. */
  createdAt: number;
};

/**
 * Evento transitorio "está escribiendo…" (Fase 8a). NO se persiste en BD.
 * Se publica a los demás miembros mientras un usuario teclea; la UI lo muestra
 * de forma efímera con su propio timeout. El throttle de emisión lo hace el
 * cliente; el servidor solo reenvía.
 */
export type TypingEvent = {
  type: "typing";
  /** Conversación donde se está escribiendo. */
  conversationId: string;
  /** Usuario que está escribiendo. */
  userId: string;
  /** Epoch ms del evento, para que la UI caduque el indicador. */
  at: number;
};

/**
 * Evento de "leído" para confirmaciones de lectura (Fase 8a).
 * Se publica a los demás miembros cuando alguien marca la conversación como
 * leída, llevando hasta qué instante leyó (para mover los "checks" de leído).
 */
export type ReadEvent = {
  type: "read";
  /** Conversación marcada como leída. */
  conversationId: string;
  /** Usuario que ha leído. */
  userId: string;
  /** Epoch ms hasta el que ha leído (su `lastReadAt`). */
  lastReadAt: number;
};

/**
 * Unión discriminada por `type` de todos los eventos que viajan por el bus.
 * Para añadir un nuevo tipo (Fase 8): define su tipo aquí y agrégalo a la unión.
 * El endpoint SSE y los consumidores hacen narrowing por `event.type`.
 */
export type AppEvent =
  | NotificationEvent
  | MessageEvent
  | TypingEvent
  | ReadEvent;

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
