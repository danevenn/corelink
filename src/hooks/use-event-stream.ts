"use client";

// Hooks de conveniencia sobre la conexión SSE compartida (Fase 7b).
//
// El transporte vive en `EventStreamProvider` (una sola EventSource por
// pestaña). Estos hooks son el API ergonómico para los consumidores: se
// suscriben a un tipo de evento y limpian solos al desmontar.

import { useEffect, useRef } from "react";
import {
  type NotificationStreamEvent,
  useEventStream,
} from "@/components/events/event-stream-provider";

/**
 * Llama a `onEvent` cada vez que llega un evento SSE `notification`.
 *
 * El callback se guarda en una ref para que cambiar su identidad (closures con
 * estado fresco) NO re-suscriba ni recree la conexión.
 */
export function useNotificationEvents(
  onEvent: (event: NotificationStreamEvent) => void,
): void {
  const stream = useEventStream();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!stream) return;
    return stream.subscribe("notification", (event) => {
      if (event.type === "notification") handlerRef.current(event);
    });
  }, [stream]);
}
