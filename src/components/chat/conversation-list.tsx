"use client";

// Lista lateral de conversaciones con actualización EN VIVO (Fase 8b).
//
// - Render inicial con `getConversations()` (prop desde server).
// - Al llegar un evento SSE `message`, refetchea la lista (snippet + orden +
//   no-leídos reconciliados con el servidor) salvo que sea la conversación
//   ABIERTA, cuyos no-leídos se ponen a 0 (la estás viendo).
// - Resalta la conversación activa (por la URL).
//
// Reusa la EventSource única vía `useChatMessageEvents` / `useReadEvents`.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useChatMessageEvents, useReadEvents } from "@/hooks/use-event-stream";
import { conversationTitle, shortTime } from "@/lib/chat-ui";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/server/chat";
import { fetchConversations } from "@/server/chat-actions";
import { ConversationAvatar } from "./conversation-avatar";

type Props = {
  initial: ConversationSummary[];
  viewerId: string;
  /** Id de la conversación abierta (para resaltar y poner su badge a 0). */
  activeId?: string;
};

export function ConversationList({ initial, viewerId, activeId }: Props) {
  const pathname = usePathname();
  const [items, setItems] = useState<ConversationSummary[]>(initial);

  // Refetch reconciliado con el servidor; al volver, fuerza a 0 el no-leído de
  // la conversación abierta (la estás viendo).
  const refresh = useCallback(async () => {
    const next = await fetchConversations();
    setItems(
      next.map((c) => (c.id === activeId ? { ...c, unreadCount: 0 } : c)),
    );
  }, [activeId]);

  // Mantén la lista en sintonía con la prop inicial cuando el server revalida.
  useEffect(() => {
    setItems(initial);
  }, [initial]);

  useChatMessageEvents(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  useReadEvents(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (items.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground">
        No tienes conversaciones todavía. Empieza una nueva.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5" aria-label="Conversaciones">
      {items.map((c) => {
        const active = c.id === activeId || pathname === `/messages/${c.id}`;
        const title = conversationTitle(c);
        const last = c.lastMessage;
        const mine = last?.senderId === viewerId;
        const unread = active ? 0 : c.unreadCount;

        return (
          <li key={c.id}>
            <Link
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
                active ? "bg-brand-soft" : "hover:bg-surface-muted",
              )}
              href={`/messages/${c.id}`}
            >
              <ConversationAvatar
                memberPreviews={c.memberPreviews}
                otherParticipant={c.otherParticipant}
                type={c.type}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      unread > 0
                        ? "font-semibold text-foreground"
                        : "font-medium text-foreground",
                    )}
                  >
                    {title}
                  </span>
                  {last ? (
                    <time
                      className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums"
                      dateTime={new Date(last.createdAt).toISOString()}
                    >
                      {shortTime(last.createdAt)}
                    </time>
                  ) : null}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "truncate text-xs",
                      unread > 0 ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {last
                      ? `${mine ? "Tú: " : ""}${last.snippet}`
                      : "Sin mensajes"}
                  </span>
                  {unread > 0 ? (
                    <span className="ml-auto grid min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold leading-5 text-brand-foreground tabular-nums">
                      <span aria-hidden="true">
                        {unread > 99 ? "99+" : unread}
                      </span>
                      <span className="sr-only">{unread} sin leer</span>
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
