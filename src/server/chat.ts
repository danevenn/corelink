// Capa de lectura del chat / mensajería (Fase 8a) — server-only.
//
// Funciones tipadas que devuelven datos LISTOS para la UI (lista de
// conversaciones con no-leídos, detalle, historial paginado, total no-leído).
// Todas exigen sesión y FILTRAN por membresía: un no-miembro nunca ve una
// conversación ajena.
//
// Estrategia anti-N+1 en `getConversations`:
//   - 1 query: memberships del viewer con la Conversation, sus miembros (perfil)
//     y el ÚLTIMO mensaje (take 1 desc) embebidos.
//   - 1 query agregada (`message.groupBy`) para el último createdAt por
//     conversación NO se usa; en su lugar contamos no-leídos con UNA query
//     adicional acotada a las conversaciones del viewer, comparando contra el
//     `lastReadAt` propio en memoria. Cero queries por conversación.

import { headers } from "next/headers";
import type { ConversationType, MemberRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Re-export de tipos de enum para que la UI (cliente) los importe desde aquí
// sin arrastrar el módulo de enums generado al bundle por accidente.
export type { ConversationType, MemberRole };

// ── Tipos de retorno (fuente de verdad para la UI) ──────────────────────────

/** Participante de una conversación (datos de perfil listos para mostrar). */
export type ChatParticipant = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
};

/** Último mensaje (snippet) de una conversación, para la lista. */
export type LastMessagePreview = {
  id: string;
  senderId: string;
  snippet: string;
  createdAt: Date;
} | null;

/** Resumen de una conversación para la lista lateral. */
export type ConversationSummary = {
  id: string;
  type: ConversationType;
  /** Solo grupos: nombre del grupo. DM = null. */
  name: string | null;
  /** Última actividad (para ordenar). */
  updatedAt: Date;
  /** En DM: el OTRO participante. En grupo: null (usa name/members). */
  otherParticipant: ChatParticipant | null;
  /** Nº total de miembros (útil para grupos). */
  memberCount: number;
  /** En grupos: avatares de algunos miembros para el stack visual. */
  memberPreviews: ChatParticipant[];
  /** Último mensaje (snippet + autor + fecha). */
  lastMessage: LastMessagePreview;
  /** Mensajes no leídos por el viewer (createdAt > lastReadAt, excluye propios). */
  unreadCount: number;
};

/** Miembro de una conversación con su estado de lectura (para "leído"). */
export type ConversationMemberView = {
  id: string;
  role: MemberRole;
  joinedAt: Date;
  /** Hasta cuándo ha leído (null = nunca). Para confirmaciones de leído. */
  lastReadAt: Date | null;
  user: ChatParticipant;
};

/** Detalle de una conversación (cabecera + miembros). */
export type ConversationDetail = {
  id: string;
  type: ConversationType;
  name: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  members: ConversationMemberView[];
};

/** Mensaje del historial, con su autor. */
export type ChatMessage = {
  id: string;
  conversationId: string;
  content: string;
  createdAt: Date;
  editedAt: Date | null;
  sender: ChatParticipant;
};

/** Página de historial paginado por cursor. */
export type MessagesPage = {
  /** Mensajes en orden CRONOLÓGICO ascendente (los más antiguos primero). */
  messages: ChatMessage[];
  /**
   * Cursor (id del mensaje MÁS ANTIGUO devuelto) para pedir la página anterior
   * (mensajes más viejos). `null` si no hay más historia hacia atrás.
   */
  nextCursor: string | null;
};

// ── Constantes ───────────────────────────────────────────────────────────────

const SNIPPET_LEN = 120;
const MEMBER_PREVIEW_LIMIT = 4;
const DEFAULT_MESSAGES_LIMIT = 30;
const MAX_MESSAGES_LIMIT = 100;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getViewerIdOrNull(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function snippetOf(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= SNIPPET_LEN) return trimmed;
  return `${trimmed.slice(0, SNIPPET_LEN).trimEnd()}…`;
}

/** Proyección de participante a partir de un User con su Profile embebido. */
type UserWithProfile = {
  id: string;
  profile: {
    displayName: string;
    avatarUrl: string | null;
    jobTitle: string | null;
  } | null;
};

function toParticipant(u: UserWithProfile): ChatParticipant {
  return {
    id: u.id,
    displayName: u.profile?.displayName ?? "Usuario",
    avatarUrl: u.profile?.avatarUrl ?? null,
    jobTitle: u.profile?.jobTitle ?? null,
  };
}

const userSelect = {
  id: true,
  profile: { select: { displayName: true, avatarUrl: true, jobTitle: true } },
} as const;

// ── Lecturas ──────────────────────────────────────────────────────────────────

/**
 * Conversaciones del viewer ordenadas por actividad reciente (`updatedAt` desc),
 * con el otro participante (DM) o nombre+miembros (grupo), último mensaje y
 * contador de no-leídos. Sin sesión → lista vacía.
 *
 * Anti-N+1: una query para las memberships+conversaciones+último mensaje y una
 * segunda query agregada para los no-leídos de todas ellas a la vez.
 */
export async function getConversations(): Promise<ConversationSummary[]> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) return [];

  // 1) Memberships del viewer con la conversación, sus miembros y el último
  //    mensaje (1 fila vía take:1 desc). Ordenadas por actividad de la conv.
  const memberships = await prisma.conversationMember.findMany({
    where: { userId: viewerId },
    orderBy: { conversation: { updatedAt: "desc" } },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          type: true,
          name: true,
          updatedAt: true,
          members: {
            select: {
              userId: true,
              user: { select: userSelect },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              senderId: true,
              content: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (memberships.length === 0) return [];

  // 2) No-leídos por conversación en UNA query. Para cada conversación, el
  //    umbral es el `lastReadAt` propio del viewer. Como groupBy no admite un
  //    umbral por-grupo distinto, contamos por conversación con una condición
  //    OR construida a partir de los pares (conversationId, lastReadAt). Es una
  //    sola query agregada, no una por conversación.
  const thresholds = memberships.map((m) => ({
    conversationId: m.conversation.id,
    lastReadAt: m.lastReadAt,
  }));

  const unreadByConv = await countUnreadPerConversation(viewerId, thresholds);

  return memberships.map((m) => {
    const conv = m.conversation;
    const others = conv.members.filter((mem) => mem.userId !== viewerId);
    const isDirect = conv.type === "DIRECT";
    const otherParticipant =
      isDirect && others[0] ? toParticipant(others[0].user) : null;

    const last = conv.messages[0];
    const lastMessage: LastMessagePreview = last
      ? {
          id: last.id,
          senderId: last.senderId,
          snippet: snippetOf(last.content),
          createdAt: last.createdAt,
        }
      : null;

    return {
      id: conv.id,
      type: conv.type,
      name: conv.name,
      updatedAt: conv.updatedAt,
      otherParticipant,
      memberCount: conv.members.length,
      memberPreviews: others
        .slice(0, MEMBER_PREVIEW_LIMIT)
        .map((mem) => toParticipant(mem.user)),
      lastMessage,
      unreadCount: unreadByConv.get(conv.id) ?? 0,
    };
  });
}

/**
 * Cuenta los mensajes no leídos del viewer por conversación. No-leído =
 * `createdAt > lastReadAt` (o todos si nunca leyó) Y `senderId != viewer`
 * (los propios nunca cuentan como no-leídos). Una sola query agregada.
 */
async function countUnreadPerConversation(
  viewerId: string,
  thresholds: { conversationId: string; lastReadAt: Date | null }[],
): Promise<Map<string, number>> {
  if (thresholds.length === 0) return new Map();

  // Condición OR: por cada conversación, su propio umbral de lastReadAt.
  const orConditions = thresholds.map((t) => ({
    conversationId: t.conversationId,
    ...(t.lastReadAt ? { createdAt: { gt: t.lastReadAt } } : {}),
  }));

  const grouped = await prisma.message.groupBy({
    by: ["conversationId"],
    where: {
      senderId: { not: viewerId },
      OR: orConditions,
    },
    _count: { _all: true },
  });

  const map = new Map<string, number>();
  for (const row of grouped) {
    map.set(row.conversationId, row._count._all);
  }
  return map;
}

/**
 * Detalle de una conversación (cabecera + miembros con `lastReadAt`). Solo si
 * el viewer es miembro; en caso contrario devuelve `null` (no filtra datos de
 * conversaciones ajenas). Sin sesión → null.
 */
export async function getConversationById(
  id: string,
): Promise<ConversationDetail | null> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) return null;

  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      name: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      members: {
        orderBy: { joinedAt: "asc" },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          lastReadAt: true,
          userId: true,
          user: { select: userSelect },
        },
      },
    },
  });

  if (!conv) return null;
  // Autorización: el viewer debe figurar entre los miembros.
  if (!conv.members.some((m) => m.userId === viewerId)) return null;

  return {
    id: conv.id,
    type: conv.type,
    name: conv.name,
    createdById: conv.createdById,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt,
    members: conv.members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      lastReadAt: m.lastReadAt,
      user: toParticipant(m.user),
    })),
  };
}

/**
 * Historial paginado de una conversación. Solo si el viewer es miembro (si no,
 * página vacía). Paginación hacia ATRÁS por cursor: traemos `limit` mensajes en
 * orden `createdAt` desc desde el cursor y los devolvemos en orden ASCENDENTE
 * (cronológico) para que la UI los pinte de arriba a abajo. `nextCursor` es el
 * id del mensaje más antiguo devuelto (pedir más = historia más vieja).
 */
export async function getMessages(
  conversationId: string,
  args?: { cursor?: string; limit?: number },
): Promise<MessagesPage> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) return { messages: [], nextCursor: null };

  // Membresía: el viewer debe pertenecer a la conversación.
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    select: { id: true },
  });
  if (!membership) return { messages: [], nextCursor: null };

  const limit = Math.min(
    args?.limit ?? DEFAULT_MESSAGES_LIMIT,
    MAX_MESSAGES_LIMIT,
  );
  const cursor = args?.cursor;

  // Traemos limit+1 en desc para saber si hay página anterior (más antigua).
  const rows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      conversationId: true,
      content: true,
      createdAt: true,
      editedAt: true,
      sender: { select: userSelect },
    },
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // El más antiguo de la página (último en desc) es el cursor para ir hacia atrás.
  const nextCursor =
    hasMore && page.length > 0 ? (page[page.length - 1]?.id ?? null) : null;

  // Invertimos a orden cronológico ascendente para la UI.
  const messages: ChatMessage[] = page
    .slice()
    .reverse()
    .map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      content: row.content,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
      sender: toParticipant(row.sender),
    }));

  return { messages, nextCursor };
}

/**
 * Total de mensajes no leídos del viewer en TODAS sus conversaciones (para un
 * badge global de "Mensajes" en la nav). 0 sin sesión.
 */
export async function getTotalUnread(): Promise<number> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) return 0;

  const memberships = await prisma.conversationMember.findMany({
    where: { userId: viewerId },
    select: { conversationId: true, lastReadAt: true },
  });
  if (memberships.length === 0) return 0;

  const thresholds = memberships.map((m) => ({
    conversationId: m.conversationId,
    lastReadAt: m.lastReadAt,
  }));

  // Reutiliza la condición OR por umbral; una sola query de conteo agregado.
  const orConditions = thresholds.map((t) => ({
    conversationId: t.conversationId,
    ...(t.lastReadAt ? { createdAt: { gt: t.lastReadAt } } : {}),
  }));

  return prisma.message.count({
    where: {
      senderId: { not: viewerId },
      OR: orConditions,
    },
  });
}
