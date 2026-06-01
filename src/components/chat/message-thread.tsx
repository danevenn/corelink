"use client";

// Hilo de una conversación: historial + composer + tiempo real (Fase 8b).
//
// Responsabilidades:
//   - Render del historial (orden cronológico) con burbujas alineadas por emisor,
//     separadores de día y agrupación visual por autor consecutivo.
//   - Composer con envío OPTIMISTA: el mensaje aparece al instante (estado
//     "sending"); se reconcilia con la respuesta de `sendMessage`; si falla, se
//     marca como "failed" y se puede reintentar.
//   - Paginación hacia atrás (cursor) con botón "Ver mensajes anteriores".
//   - Tiempo real (reusa la EventSource única):
//       · `message` de ESTA conversación → append (refetch del nuevo) + auto-scroll
//         si estás abajo + markConversationRead (estás viéndola).
//       · `typing` → indicador efímero "X está escribiendo…" que caduca solo.
//       · `read` → actualiza el estado "visto" de TUS mensajes.
//   - Throttle de `sendTyping` (≤1 cada 2.5s) al teclear.
//   - a11y: log con aria-live="polite", composer con label, foco al abrir, el
//     auto-scroll no roba el foco.

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useChatMessageEvents,
  useReadEvents,
  useTypingEvents,
} from "@/hooks/use-event-stream";
import { dayKey, dayLabel, readersOf, shortTime } from "@/lib/chat-ui";
import type {
  ChatMessage,
  ConversationDetail,
  ConversationMemberView,
} from "@/server/chat";
import {
  fetchConversationDetail,
  fetchMessages,
  markConversationRead,
  sendMessage,
  sendTyping,
} from "@/server/chat-actions";
import { Composer } from "./composer";
import { MessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";

type Props = {
  conversationId: string;
  viewerId: string;
  initialMessages: ChatMessage[];
  initialCursor: string | null;
  initialMembers: ConversationMemberView[];
};

/** Mensaje en vuelo (optimista) hasta que el servidor confirma. */
type PendingMessage = ChatMessage & { status: "sending" | "failed" };

/** Type guard: ¿es un mensaje optimista en vuelo (con estado de envío)? */
function isPending(m: ChatMessage | PendingMessage): m is PendingMessage {
  return "status" in m;
}

const TYPING_THROTTLE_MS = 2500;
const TYPING_EXPIRE_MS = 3500;
const NEAR_BOTTOM_PX = 120;

export function MessageThread({
  conversationId,
  viewerId,
  initialMessages,
  initialCursor,
  initialMembers,
}: Props) {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [members, setMembers] =
    useState<ConversationMemberView[]>(initialMembers);
  // Mapa userId → epoch ms del último evento typing, para caducarlos.
  const [typing, setTyping] = useState<Map<string, number>>(new Map());

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypingSentRef = useRef(0);
  const seenMessageIdsRef = useRef<Set<string>>(
    new Set(initialMessages.map((m) => m.id)),
  );

  // ── Auto-scroll: solo si el usuario ya estaba cerca del fondo ───────────────
  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // Baja al fondo al montar (conversación recién abierta).
  // biome-ignore lint/correctness/useExhaustiveDependencies: solo al montar.
  useLayoutEffect(() => {
    scrollToBottom("auto");
  }, []);

  // ── Marcar leído al abrir y reconciliar miembros (lastReadAt) ───────────────
  const markRead = useCallback(async () => {
    await markConversationRead({ conversationId });
    // Refresca la cabecera del badge global / lista lateral.
    router.refresh();
  }, [conversationId, router]);

  const refreshMembers = useCallback(async () => {
    const detail: ConversationDetail | null =
      await fetchConversationDetail(conversationId);
    if (detail) setMembers(detail.members);
  }, [conversationId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: solo al abrir.
  useEffect(() => {
    void markRead();
  }, [conversationId]);

  // ── Tiempo real: mensaje nuevo en ESTA conversación ─────────────────────────
  useChatMessageEvents(
    useCallback(
      (event) => {
        if (event.conversationId !== conversationId) return;
        if (seenMessageIdsRef.current.has(event.messageId)) return;
        const wasNearBottom = isNearBottom();
        // Refetcheamos la página más reciente y añadimos lo que falte.
        void fetchMessages(conversationId, { limit: 20 }).then((page) => {
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id));
            const fresh = page.messages.filter((m) => !known.has(m.id));
            for (const m of fresh) seenMessageIdsRef.current.add(m.id);
            if (fresh.length === 0) return prev;
            return [...prev, ...fresh];
          });
          if (wasNearBottom)
            requestAnimationFrame(() => scrollToBottom("smooth"));
        });
        // Quien envía dejó de escribir.
        setTyping((prev) => {
          if (!prev.has(event.senderId)) return prev;
          const next = new Map(prev);
          next.delete(event.senderId);
          return next;
        });
        // La estás viendo: márcala como leída (y refresca confirmaciones).
        void markConversationRead({ conversationId }).then(() => {
          void refreshMembers();
          router.refresh();
        });
      },
      [conversationId, isNearBottom, scrollToBottom, refreshMembers, router],
    ),
  );

  // ── Tiempo real: typing entrante ────────────────────────────────────────────
  useTypingEvents(
    useCallback(
      (event) => {
        if (event.conversationId !== conversationId) return;
        if (event.userId === viewerId) return;
        setTyping((prev) => {
          const next = new Map(prev);
          next.set(event.userId, event.at);
          return next;
        });
      },
      [conversationId, viewerId],
    ),
  );

  // Caduca los indicadores de typing sin nuevos eventos.
  useEffect(() => {
    if (typing.size === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setTyping((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [uid, at] of prev) {
          if (now - at > TYPING_EXPIRE_MS) {
            next.delete(uid);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [typing]);

  // ── Tiempo real: read entrante (confirmaciones de leído de mis mensajes) ────
  useReadEvents(
    useCallback(
      (event) => {
        if (event.conversationId !== conversationId) return;
        setMembers((prev) =>
          prev.map((m) =>
            m.user.id === event.userId
              ? { ...m, lastReadAt: new Date(event.lastReadAt) }
              : m,
          ),
        );
      },
      [conversationId],
    ),
  );

  // ── Throttle de typing al teclear ───────────────────────────────────────────
  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
    lastTypingSentRef.current = now;
    void sendTyping({ conversationId });
  }, [conversationId]);

  // ── Envío optimista ─────────────────────────────────────────────────────────
  const doSend = useCallback(
    async (content: string) => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: PendingMessage = {
        id: tempId,
        conversationId,
        content,
        createdAt: new Date(),
        editedAt: null,
        sender: members.find((m) => m.user.id === viewerId)?.user ?? {
          id: viewerId,
          displayName: "Tú",
          avatarUrl: null,
          jobTitle: null,
        },
        // Adjuntos del envío optimista (Fase 9a): aún sin soporte de subida en
        // esta isla; se rellenará en 9b. Vacío para satisfacer el tipo.
        attachments: [],
        status: "sending",
      };
      setPending((prev) => [...prev, optimistic]);
      requestAnimationFrame(() => scrollToBottom("smooth"));

      const result = await sendMessage({ conversationId, content });
      if (result.ok) {
        const created = result.data.message;
        seenMessageIdsRef.current.add(created.id);
        // Reconcilia: quita el optimista, añade el real confirmado.
        setPending((prev) => prev.filter((m) => m.id !== tempId));
        setMessages((prev) => {
          if (prev.some((m) => m.id === created.id)) return prev;
          return [
            ...prev,
            {
              id: created.id,
              conversationId: created.conversationId,
              content: created.content,
              createdAt: created.createdAt,
              editedAt: null,
              sender: optimistic.sender,
              attachments: [],
            },
          ];
        });
        router.refresh();
      } else {
        // Revierte a estado fallido (permite reintentar / no se pierde el texto).
        setPending((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)),
        );
      }
    },
    [conversationId, members, viewerId, scrollToBottom, router],
  );

  const retry = useCallback(
    (tempId: string) => {
      const failed = pending.find((m) => m.id === tempId);
      if (!failed) return;
      setPending((prev) => prev.filter((m) => m.id !== tempId));
      void doSend(failed.content);
    },
    [pending, doSend],
  );

  // ── Cargar historial hacia atrás ────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    try {
      const page = await fetchMessages(conversationId, { cursor, limit: 30 });
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        const older = page.messages.filter((m) => !known.has(m.id));
        for (const m of older) seenMessageIdsRef.current.add(m.id);
        return [...older, ...prev];
      });
      setCursor(page.nextCursor);
      // Mantén la posición de scroll tras prepend.
      requestAnimationFrame(() => {
        const e = scrollRef.current;
        if (e) e.scrollTop = e.scrollHeight - prevHeight;
      });
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, conversationId]);

  // ── Composición de la lista a renderizar ────────────────────────────────────
  const rendered = useMemo<(ChatMessage | PendingMessage)[]>(
    () => [...messages, ...pending],
    [messages, pending],
  );

  const typingNames = useMemo(() => {
    const names: string[] = [];
    for (const uid of typing.keys()) {
      const m = members.find((mem) => mem.user.id === uid);
      if (m) names.push(m.user.displayName);
    }
    return names;
  }, [typing, members]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* role="log" + aria-live anuncia los mensajes entrantes con criterio. */}
      <div
        aria-label="Historial de mensajes"
        aria-live="polite"
        className="flex-1 overflow-y-auto px-4 py-4"
        ref={scrollRef}
        role="log"
      >
        {cursor ? (
          <div className="mb-3 flex justify-center">
            <button
              className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-surface-muted disabled:opacity-60"
              disabled={loadingMore}
              onClick={() => void loadMore()}
              type="button"
            >
              {loadingMore ? "Cargando…" : "Ver mensajes anteriores"}
            </button>
          </div>
        ) : null}

        <ol className="flex flex-col gap-1">
          {rendered.map((msg, i) => {
            const prev = rendered[i - 1];
            const mine = msg.sender.id === viewerId;
            const showDay =
              !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);
            const groupedWithPrev =
              !showDay &&
              !!prev &&
              prev.sender.id === msg.sender.id &&
              new Date(msg.createdAt).getTime() -
                new Date(prev.createdAt).getTime() <
                5 * 60 * 1000;
            const status = isPending(msg) ? msg.status : undefined;
            // Confirmación de leído: solo en el ÚLTIMO mensaje propio confirmado.
            const isLastMine =
              mine &&
              !status &&
              rendered.slice(i + 1).every((m) => m.sender.id !== viewerId);
            const seenBy = isLastMine
              ? readersOf(members, viewerId, msg.createdAt)
              : 0;

            return (
              <li key={msg.id}>
                {showDay ? (
                  <div className="my-3 flex items-center justify-center">
                    <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {dayLabel(msg.createdAt)}
                    </span>
                  </div>
                ) : null}
                <MessageBubble
                  content={msg.content}
                  grouped={groupedWithPrev}
                  mine={mine}
                  onRetry={
                    status === "failed" ? () => retry(msg.id) : undefined
                  }
                  otherCount={members.length - 1}
                  seenBy={seenBy}
                  senderName={msg.sender.displayName}
                  showSeen={isLastMine}
                  status={status}
                  time={shortTime(msg.createdAt)}
                />
              </li>
            );
          })}
        </ol>

        <TypingIndicator names={typingNames} />
      </div>

      <Composer onSend={doSend} onTyping={handleTyping} />
    </div>
  );
}
