"use client";

// Hooks de conveniencia sobre la conexión SSE compartida (Fase 7b).
//
// El transporte vive en `EventStreamProvider` (una sola EventSource por
// pestaña). Estos hooks son el API ergonómico para los consumidores: se
// suscriben a un tipo de evento y limpian solos al desmontar.

import { useEffect, useRef } from "react";
import {
  type MessageStreamEvent,
  type NotificationStreamEvent,
  type ReadStreamEvent,
  type TypingStreamEvent,
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

/**
 * Llama a `onEvent` cada vez que llega un evento SSE `message` (mensaje nuevo en
 * alguna conversación del viewer). El callback va en ref para no re-suscribir.
 */
export function useChatMessageEvents(
  onEvent: (event: MessageStreamEvent) => void,
): void {
  const stream = useEventStream();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!stream) return;
    return stream.subscribe("message", (event) => {
      if (event.type === "message") handlerRef.current(event);
    });
  }, [stream]);
}

/** Llama a `onEvent` cuando otro miembro está escribiendo (`typing`). */
export function useTypingEvents(
  onEvent: (event: TypingStreamEvent) => void,
): void {
  const stream = useEventStream();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!stream) return;
    return stream.subscribe("typing", (event) => {
      if (event.type === "typing") handlerRef.current(event);
    });
  }, [stream]);
}

/** Llama a `onEvent` cuando otro miembro marca como leído (`read`). */
export function useReadEvents(onEvent: (event: ReadStreamEvent) => void): void {
  const stream = useEventStream();
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!stream) return;
    return stream.subscribe("read", (event) => {
      if (event.type === "read") handlerRef.current(event);
    });
  }, [stream]);
}
