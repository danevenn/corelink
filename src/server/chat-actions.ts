"use server";

// Server Actions de mensajería / chat (Fase 8a).
//
// Contrato consistente con el resto del proyecto (`post-actions.ts`): toda
// acción devuelve un `ActionResult<T>` SERIALIZABLE discriminado; nunca lanza
// para el flujo normal (validación, autorización, no-miembro). Los errores
// inesperados se capturan y devuelven como `{ ok: false }` con mensaje genérico.
//
// Seguridad:
//   - Todas exigen sesión (Better Auth). Sin sesión → { ok: false }.
//   - Autorización a nivel de MEMBRESÍA: enviar/leer/escribir exigen que el
//     viewer pertenezca a la conversación (verificado por query, no por id
//     suelto), de modo que un no-miembro no puede operar sobre ella.
//
// Tiempo real: las mutaciones publican AppEvent ("message"/"read"/"typing") al
// bus existente (src/server/events) por CADA miembro destinatario MENOS el
// emisor. El SSE de Fase 7 los reenvía sin cambios. Los mensajes de chat NO
// crean filas Notification: el chat tiene su propio no-leído vía `lastReadAt`.

import { headers } from "next/headers";
import { ConversationType, MemberRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  conversationIdSchema,
  createGroupSchema,
  getOrCreateDirectSchema,
  sendMessageSchema,
} from "@/lib/validations/chat";
import {
  type ConversationDetail,
  type ConversationSummary,
  getConversationById,
  getConversations,
  getMessages,
  getTotalUnread,
  type MessagesPage,
} from "@/server/chat";
import { eventBus } from "@/server/events/bus";
import { searchUsers, type UserSearchResult } from "@/server/search";

// ── Contrato de resultado (reutiliza la forma de post-actions) ───────────────

export type ActionError = {
  message: string;
  /** Errores de validación por campo (zod flatten), si aplica. */
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

/** Mensaje recién creado, listo para render optimista en cliente. */
export type CreatedMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getViewerIdOrNull(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function invalid(fieldErrors: Record<string, string[]>): ActionResult<never> {
  return {
    ok: false,
    error: { message: "Datos no válidos.", fieldErrors },
  };
}

/**
 * Clave determinista de un DM 1:1: ids del par ordenados lexicográficamente y
 * unidos por ":". Garantiza que (A,B) y (B,A) produzcan la MISMA clave, y junto
 * al índice unique de `Conversation.directKey` impide duplicar el DM sin
 * carreras (un INSERT concurrente choca con P2002 y se resuelve leyendo el
 * existente).
 */
function directKeyFor(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/**
 * Devuelve los userIds de los miembros de una conversación SI el viewer es uno
 * de ellos; `null` si la conversación no existe o el viewer no es miembro.
 * Una sola query: trae los miembros y comprobamos pertenencia en memoria.
 */
async function getMemberIdsIfMember(
  conversationId: string,
  viewerId: string,
): Promise<string[] | null> {
  const members = await prisma.conversationMember.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  if (members.length === 0) return null;
  const ids = members.map((m) => m.userId);
  if (!ids.includes(viewerId)) return null;
  return ids;
}

/** Publica un evento a cada destinatario (best-effort, no bloquea el flujo). */
async function publishToRecipients(
  recipientIds: string[],
  build: (userId: string) => Parameters<typeof eventBus.publish>[1],
): Promise<void> {
  await Promise.all(
    recipientIds.map(async (uid) => {
      try {
        await eventBus.publish(uid, build(uid));
      } catch {
        // El bus es secundario: el dato ya está persistido y se verá al
        // refetchear aunque el evento en vivo no llegue.
      }
    }),
  );
}

// ── Acciones ──────────────────────────────────────────────────────────────────

/**
 * Encuentra o crea el DM 1:1 entre el viewer y `otherUserId`. Idempotente y
 * sin carreras gracias a `directKey` unique. No permite DM consigo mismo.
 */
export async function getOrCreateDirectConversation(
  input: unknown,
): Promise<ActionResult<{ conversationId: string }>> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = getOrCreateDirectSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }
  const { otherUserId } = parsed.data;

  if (otherUserId === viewerId) {
    return {
      ok: false,
      error: { message: "No puedes abrir un chat contigo mismo." },
    };
  }

  try {
    // El otro usuario debe existir (evita crear DMs huérfanos).
    const other = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true },
    });
    if (!other) {
      return { ok: false, error: { message: "El usuario no existe." } };
    }

    const directKey = directKeyFor(viewerId, otherUserId);

    // Camino feliz: ya existe.
    const existing = await prisma.conversation.findUnique({
      where: { directKey },
      select: { id: true },
    });
    if (existing) {
      return { ok: true, data: { conversationId: existing.id } };
    }

    // Crear conversación + sus dos miembros atómicamente. Si dos requests
    // compiten, el segundo choca con el unique de directKey (P2002) y leemos
    // el ya creado.
    try {
      const created = await prisma.conversation.create({
        data: {
          type: ConversationType.DIRECT,
          directKey,
          createdById: viewerId,
          members: {
            create: [
              { userId: viewerId, role: MemberRole.MEMBER },
              { userId: otherUserId, role: MemberRole.MEMBER },
            ],
          },
        },
        select: { id: true },
      });
      return { ok: true, data: { conversationId: created.id } };
    } catch (err) {
      // Carrera: otro request creó el mismo DM entre el findUnique y el create.
      if (isUniqueViolation(err)) {
        const raced = await prisma.conversation.findUnique({
          where: { directKey },
          select: { id: true },
        });
        if (raced) {
          return { ok: true, data: { conversationId: raced.id } };
        }
      }
      throw err;
    }
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo abrir la conversación." },
    };
  }
}

/**
 * Crea un grupo. El creador es ADMIN y miembro; `memberIds` se añaden como
 * MEMBER. Valida nombre no vacío y al menos 1 miembro además del creador.
 */
export async function createGroupConversation(
  input: unknown,
): Promise<ActionResult<{ conversationId: string }>> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }
  const { name } = parsed.data;

  // Deduplica y excluye al creador de la lista de miembros (él va como ADMIN).
  const memberIds = [...new Set(parsed.data.memberIds)].filter(
    (id) => id !== viewerId,
  );
  if (memberIds.length === 0) {
    return {
      ok: false,
      error: {
        message: "Añade al menos un miembro distinto de ti.",
        fieldErrors: {
          memberIds: ["Añade al menos un miembro distinto de ti."],
        },
      },
    };
  }

  try {
    // Todos los memberIds deben existir como usuarios reales.
    const found = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true },
    });
    if (found.length !== memberIds.length) {
      return {
        ok: false,
        error: { message: "Alguno de los usuarios no existe." },
      };
    }

    const created = await prisma.conversation.create({
      data: {
        type: ConversationType.GROUP,
        name,
        createdById: viewerId,
        members: {
          create: [
            { userId: viewerId, role: MemberRole.ADMIN },
            ...memberIds.map((id) => ({
              userId: id,
              role: MemberRole.MEMBER,
            })),
          ],
        },
      },
      select: { id: true },
    });

    return { ok: true, data: { conversationId: created.id } };
  } catch {
    return { ok: false, error: { message: "No se pudo crear el grupo." } };
  }
}

/**
 * Envía un mensaje a una conversación. Solo si el viewer es miembro. Inserta el
 * Message, toca `Conversation.updatedAt` (para ordenar por actividad) en una
 * transacción, y publica el evento "message" a los DEMÁS miembros. Devuelve el
 * mensaje creado para render optimista.
 */
export async function sendMessage(
  input: unknown,
): Promise<ActionResult<{ message: CreatedMessage }>> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }
  const { conversationId, content, attachments } = parsed.data;

  try {
    const memberIds = await getMemberIdsIfMember(conversationId, viewerId);
    if (!memberIds) {
      return {
        ok: false,
        error: { message: "No perteneces a esta conversación." },
      };
    }

    // Multi-write: insertar mensaje (+ adjuntos) + tocar updatedAt → transacción.
    // El zod garantiza content o al menos un adjunto; `content` cae a "" para la
    // columna NOT NULL en mensajes solo-imagen. Cada Attachment queda ligado al
    // mensaje (messageId set, postId null) cumpliendo el CHECK de exclusividad.
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: viewerId,
          content: content ?? "",
          ...(attachments && attachments.length > 0
            ? {
                attachments: {
                  create: attachments.map((a) => ({
                    url: a.url,
                    key: a.key,
                    mime: a.mime,
                    size: a.size,
                  })),
                },
              }
            : {}),
        },
        select: {
          id: true,
          conversationId: true,
          senderId: true,
          content: true,
          createdAt: true,
        },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      return created;
    });

    // Publica a todos los miembros MENOS al emisor (él ya tiene el mensaje).
    const recipients = memberIds.filter((id) => id !== viewerId);
    await publishToRecipients(recipients, () => ({
      type: "message",
      conversationId,
      messageId: message.id,
      senderId: viewerId,
      createdAt: message.createdAt.getTime(),
    }));

    return { ok: true, data: { message } };
  } catch {
    return { ok: false, error: { message: "No se pudo enviar el mensaje." } };
  }
}

/**
 * Marca la conversación como leída para el viewer (`lastReadAt = now()`) y
 * publica "read" a los demás miembros (confirmaciones de leído). Solo miembros.
 */
export async function markConversationRead(
  input: unknown,
): Promise<ActionResult<{ lastReadAt: Date }>> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }
  const { conversationId } = parsed.data;

  try {
    const memberIds = await getMemberIdsIfMember(conversationId, viewerId);
    if (!memberIds) {
      return {
        ok: false,
        error: { message: "No perteneces a esta conversación." },
      };
    }

    const lastReadAt = new Date();
    // Autorización a nivel de query: el WHERE filtra por (conversationId,userId)
    // del viewer; un no-miembro ya quedó descartado arriba.
    await prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: viewerId } },
      data: { lastReadAt },
    });

    const recipients = memberIds.filter((id) => id !== viewerId);
    await publishToRecipients(recipients, () => ({
      type: "read",
      conversationId,
      userId: viewerId,
      lastReadAt: lastReadAt.getTime(),
    }));

    return { ok: true, data: { lastReadAt } };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo marcar como leída." },
    };
  }
}

/**
 * Señala que el viewer está escribiendo en una conversación. NO escribe en BD:
 * solo publica un evento transitorio "typing" a los demás miembros. El throttle
 * de emisión lo hace la UI. Solo miembros.
 */
export async function sendTyping(
  input: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) {
    return invalid(parsed.error.flatten().fieldErrors);
  }
  const { conversationId } = parsed.data;

  try {
    const memberIds = await getMemberIdsIfMember(conversationId, viewerId);
    if (!memberIds) {
      return {
        ok: false,
        error: { message: "No perteneces a esta conversación." },
      };
    }

    const recipients = memberIds.filter((id) => id !== viewerId);
    await publishToRecipients(recipients, () => ({
      type: "typing",
      conversationId,
      userId: viewerId,
      at: Date.now(),
    }));

    return { ok: true, data: { ok: true } };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo enviar el indicador de escritura." },
    };
  }
}

// ── Wrappers de lectura para el cliente ──────────────────────────────────────
// Las QUERIES de chat viven en `chat.ts` (server-only). Estos wrappers
// `"use server"` las exponen como acciones invocables desde client islands para
// REFETCHEAR en vivo (al llegar un evento SSE, hacer scroll de historial, etc.),
// sin reescribir lógica de datos —mismo patrón que `fetchNotificationsPage` (7b).

/** Wrapper cliente de `getConversations` (lista lateral, refetch en vivo). */
export async function fetchConversations(): Promise<ConversationSummary[]> {
  return getConversations();
}

/** Wrapper cliente de `getConversationById` (cabecera + miembros con leído). */
export async function fetchConversationDetail(
  conversationId: string,
): Promise<ConversationDetail | null> {
  return getConversationById(conversationId);
}

/** Wrapper cliente de `getMessages` (historial paginado / mensajes nuevos). */
export async function fetchMessages(
  conversationId: string,
  args?: { cursor?: string; limit?: number },
): Promise<MessagesPage> {
  return getMessages(conversationId, args);
}

/** Wrapper cliente de `getTotalUnread` (badge global, reconciliación). */
export async function fetchTotalUnread(): Promise<number> {
  return getTotalUnread();
}

/** Wrapper cliente de `searchUsers` (elegir destinatarios de DM/grupo). */
export async function searchUsersAction(
  q: string,
): Promise<UserSearchResult[]> {
  return searchUsers(q, { limit: 8 });
}

// ── Utilidad de error Prisma ──────────────────────────────────────────────────

/** True si el error es una violación de unique constraint de Prisma (P2002). */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}
