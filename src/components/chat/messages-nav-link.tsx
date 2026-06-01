"use client";

// Enlace "Mensajes" en la cabecera con badge de NO-LEÍDOS GLOBAL en vivo (8b).
//
// - Se inicializa con `getTotalUnread()` (server, vía prop).
// - Sube al llegar un evento SSE `message` de OTRA persona (reusa la EventSource
//   única del provider; no abre otra conexión).
// - Baja a 0 al entrar a /messages (lo leído lo confirma el servidor); además
//   reconcilia con `fetchTotalUnread()` al recibir eventos `read` propios.
//
// Patrón coherente con NotificationBell (useState + SSE, sin react-query).

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MessageIcon } from "@/components/feed/icons";
import { useChatMessageEvents, useReadEvents } from "@/hooks/use-event-stream";
import { cn } from "@/lib/utils";
import { fetchTotalUnread } from "@/server/chat-actions";

type Props = {
  /** Total inicial de no-leídos (server: getTotalUnread). */
  initialUnread: number;
};

export function MessagesNavLink({ initialUnread }: Props) {
  const pathname = usePathname();
  const onMessages = pathname.startsWith("/messages");
  const [unread, setUnread] = useState(initialUnread);
  const [pulse, setPulse] = useState(0);

  // Reconciliamos con el total real al cambiar de ruta dentro de /messages: al
  // abrir una conversación esta se marca leída (sin evento `read` para uno
  // mismo), así que tras un breve margen pedimos el total para que el badge
  // baje. Fuera de /messages no tocamos (el incremento optimista basta).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-conciliar al cambiar de conversación.
  useEffect(() => {
    if (!onMessages) return;
    const t = setTimeout(() => {
      void fetchTotalUnread().then(setUnread);
    }, 400);
    return () => clearTimeout(t);
  }, [onMessages, pathname]);

  // Mensaje entrante de otra persona. Fuera de mensajes: incremento optimista.
  // Dentro de mensajes: reconcilia con el servidor (la conversación abierta ya
  // se habrá marcado leída, así que solo suma lo de OTRAS conversaciones).
  useChatMessageEvents(
    useCallback(() => {
      if (onMessages) {
        void fetchTotalUnread().then((n) => {
          setUnread((prev) => {
            if (n > prev) setPulse((p) => p + 1);
            return n;
          });
        });
        return;
      }
      setUnread((n) => n + 1);
      setPulse((p) => p + 1);
    }, [onMessages]),
  );

  // Al marcar algo leído (propio, desde la sección o desde otra pestaña),
  // reconciliamos el total con el servidor para que el badge baje.
  useReadEvents(
    useCallback(() => {
      void fetchTotalUnread().then(setUnread);
    }, []),
  );

  const label =
    unread > 0 ? `Mensajes, ${unread} sin leer` : "Mensajes, sin novedades";

  return (
    <Link
      aria-label={label}
      className={cn(
        "relative rounded-lg p-2 transition hover:bg-surface-muted",
        onMessages
          ? "text-brand"
          : "text-muted-foreground hover:text-foreground",
      )}
      href="/messages"
    >
      <MessageIcon className="size-5" />
      <AnimatePresence>
        {unread > 0 ? (
          <motion.span
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-brand-foreground tabular-nums"
            exit={{ scale: 0 }}
            initial={{ scale: 0.6 }}
            key={`badge-${pulse}`}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
          >
            {unread > 99 ? "99+" : unread}
          </motion.span>
        ) : null}
      </AnimatePresence>
      <span aria-live="polite" className="sr-only">
        {unread > 0 ? `Tienes ${unread} mensajes sin leer` : ""}
      </span>
    </Link>
  );
}
