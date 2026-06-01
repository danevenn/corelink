// Helpers de presentación puros del chat (sin estado, sin servidor).

import type {
  ConversationMemberView,
  ConversationSummary,
} from "@/server/chat";

/** Título a mostrar para una conversación (nombre de grupo u otro participante). */
export function conversationTitle(c: ConversationSummary): string {
  if (c.type === "GROUP") return c.name ?? "Grupo";
  return c.otherParticipant?.displayName ?? "Conversación";
}

/** Hora corta (HH:MM) para el snippet de la lista y las burbujas. */
export function shortTime(date: Date): string {
  return new Date(date).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Fecha legible para separadores de día en el hilo. */
export function dayLabel(date: Date, now: Date = new Date()): string {
  const d = new Date(date);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, now)) return "Hoy";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "Ayer";

  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

/** Clave de día (YYYY-MM-DD) para agrupar mensajes por fecha. */
export function dayKey(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * ¿Han VISTO mis mensajes los demás? Devuelve cuántos otros miembros tienen un
 * `lastReadAt` >= `messageCreatedAt`. Para confirmaciones de leído de los
 * mensajes propios. `viewerId` se excluye (no cuenta su propia lectura).
 */
export function readersOf(
  members: ConversationMemberView[],
  viewerId: string,
  messageCreatedAt: Date,
): number {
  const at = new Date(messageCreatedAt).getTime();
  let count = 0;
  for (const m of members) {
    if (m.user.id === viewerId) continue;
    if (m.lastReadAt && new Date(m.lastReadAt).getTime() >= at) count += 1;
  }
  return count;
}
