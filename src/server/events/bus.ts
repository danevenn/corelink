// Punto de entrada público del bus de eventos (Fase 7a).
//
// Los consumidores (actions, helper de notificaciones, endpoint SSE) importan
// `eventBus` desde aquí, no desde la implementación concreta. Así, cambiar el
// transporte (p.ej. Postgres LISTEN/NOTIFY → Redis pub/sub para la demo en Neon,
// ver caveat en `pg-bus.ts`) no toca a ningún consumidor: basta reapuntar este
// re-export a otra implementación de `EventBus`.

export { eventBus } from "./pg-bus";
export type {
  AppEvent,
  AppEventType,
  EventBus,
  EventHandler,
  MessageEvent,
  NotificationEvent,
  ReadEvent,
  TypingEvent,
  Unsubscribe,
} from "./types";
