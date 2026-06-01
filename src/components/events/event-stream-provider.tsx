"use client";

// Proveedor de la conexión SSE ÚNICA y compartida de la app (Fase 7b).
//
// Diseño pensado para REUTILIZACIÓN (Fase 8 chat): mantenemos UNA sola
// `EventSource('/api/events')` viva para toda la zona autenticada y multiplexamos
// sus eventos a los consumidores (campana de notificaciones hoy; mensajes/typing
// del chat mañana) mediante un registro de listeners por tipo de evento.
//
// Por qué un provider y no un hook suelto: si cada island (campana, futuro chat)
// abriera su propia EventSource, tendríamos N conexiones por usuario y N
// LISTEN/NOTIFY en Postgres. Centralizando en el layout `(app)` hay exactamente
// una conexión por pestaña, y los consumidores se suscriben/desuscriben en
// caliente sin tocar el transporte.
//
// EventSource ya reconecta solo; aquí sólo exponemos el estado de conexión
// (para UI/diagnóstico) y garantizamos el cierre limpio al desmontar.

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ── Tipos de eventos (espejo cliente del bus server) ────────────────────────
// Mantener en sintonía con `src/server/events/types.ts`. Definidos aquí para no
// arrastrar módulos server-only al bundle cliente.

export type NotificationStreamEvent = {
  type: "notification";
  notificationId: string;
  notificationType: string;
  actorId: string;
  postId: string | null;
  createdAt: number;
};

/** Mensaje nuevo en una conversación (Fase 8b). Payload mínimo: el cliente
 * refetchea el contenido con `fetchMessages` si lo necesita. */
export type MessageStreamEvent = {
  type: "message";
  conversationId: string;
  messageId: string;
  senderId: string;
  createdAt: number;
};

/** Indicador efímero "está escribiendo…" (Fase 8b). No se persiste. */
export type TypingStreamEvent = {
  type: "typing";
  conversationId: string;
  userId: string;
  at: number;
};

/** Confirmación de leído (Fase 8b): hasta cuándo leyó `userId`. */
export type ReadStreamEvent = {
  type: "read";
  conversationId: string;
  userId: string;
  lastReadAt: number;
};

/** Unión de eventos que el cliente sabe interpretar (notificaciones + chat). */
export type StreamEvent =
  | NotificationStreamEvent
  | MessageStreamEvent
  | TypingStreamEvent
  | ReadStreamEvent;

/** Nombres de evento SSE a los que un consumidor puede suscribirse. */
export type StreamEventName = StreamEvent["type"];

type Listener = (event: StreamEvent) => void;

export type ConnectionStatus = "connecting" | "open" | "closed";

type EventStreamContextValue = {
  status: ConnectionStatus;
  /**
   * Suscribe un handler a un tipo de evento SSE. Devuelve la función de baja.
   * Varios consumidores pueden escuchar el mismo tipo simultáneamente.
   */
  subscribe: (name: StreamEventName, listener: Listener) => () => void;
};

const EventStreamContext = createContext<EventStreamContextValue | null>(null);

type Props = {
  /** Sólo montar el stream para usuarios autenticados (lo decide el layout). */
  enabled?: boolean;
  children: ReactNode;
};

export function EventStreamProvider({ enabled = true, children }: Props) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  // Registro de listeners por nombre de evento. Ref para no recrear la
  // EventSource cuando cambian las suscripciones.
  const listenersRef = useRef<Map<StreamEventName, Set<Listener>>>(new Map());

  const subscribe = useCallback((name: StreamEventName, listener: Listener) => {
    let set = listenersRef.current.get(name);
    if (!set) {
      set = new Set();
      listenersRef.current.set(name, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus("closed");
      return;
    }

    const source = new EventSource("/api/events");

    const dispatch = (name: StreamEventName) => (e: MessageEvent) => {
      let parsed: StreamEvent;
      try {
        parsed = JSON.parse(e.data) as StreamEvent;
      } catch {
        // Evento malformado: ignorar en lugar de tumbar el stream.
        return;
      }
      const set = listenersRef.current.get(name);
      if (!set) return;
      for (const listener of set) listener(parsed);
    };

    // Registramos un handler por cada tipo de evento conocido. El endpoint emite
    // `event: notification` (Fase 7) y `event: message|typing|read` (Fase 8b),
    // todos por la MISMA EventSource compartida.
    const onNotification = dispatch("notification");
    const onMessage = dispatch("message");
    const onTyping = dispatch("typing");
    const onRead = dispatch("read");
    source.addEventListener("notification", onNotification as EventListener);
    source.addEventListener("message", onMessage as EventListener);
    source.addEventListener("typing", onTyping as EventListener);
    source.addEventListener("read", onRead as EventListener);

    source.onopen = () => setStatus("open");
    // EventSource reconecta solo: onerror marca "connecting" mientras reintenta.
    source.onerror = () => {
      setStatus(
        source.readyState === EventSource.CLOSED ? "closed" : "connecting",
      );
    };

    return () => {
      source.removeEventListener(
        "notification",
        onNotification as EventListener,
      );
      source.removeEventListener("message", onMessage as EventListener);
      source.removeEventListener("typing", onTyping as EventListener);
      source.removeEventListener("read", onRead as EventListener);
      source.close();
      setStatus("closed");
    };
  }, [enabled]);

  const value = useMemo<EventStreamContextValue>(
    () => ({ status, subscribe }),
    [status, subscribe],
  );

  return (
    <EventStreamContext.Provider value={value}>
      {children}
    </EventStreamContext.Provider>
  );
}

/**
 * Acceso al stream compartido. Devuelve null fuera del provider (p.ej. zonas
 * públicas sin sesión), para que los consumidores degraden con elegancia.
 */
export function useEventStream(): EventStreamContextValue | null {
  return useContext(EventStreamContext);
}
