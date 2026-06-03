// Menciones @usuario (backend) — server-only.
//
// ─────────────────────────────────────────────────────────────────────────────
// FORMATO DE TOKEN (CONTRATO con la UI — la fase de UI DEBE respetarlo)
// ─────────────────────────────────────────────────────────────────────────────
// Una mención se representa en el TEXTO del post/mensaje como un token
// estructurado estilo enlace markdown, AUTO-CONTENIDO (lleva el nombre visible
// y el id real del usuario):
//
//     @[displayName](userId)
//
//   - El contenido se sigue almacenando como texto plano con estos tokens
//     incrustados. El backend NO cambia el almacenamiento: solo PARSEA el texto
//     para crear filas `Mention` y disparar notificaciones MENTION.
//   - El `displayName` del token es solo para el render de la UI; el backend
//     NUNCA confía en él. La ÚNICA fuente de verdad es el `userId`, validado
//     contra la tabla `user`. Un token con un id inexistente se descarta.
//   - `userId`: id de Better Auth (nanoid: A–Z a–z 0–9 _ -). NO admite ')' ni
//     espacios, por eso el patrón `[^)\s]+` lo captura sin ambigüedad.
//   - `displayName`: cualquier texto sin ']' (puede llevar espacios/acentos),
//     no codiciosamente, para no engullir tokens contiguos.
//
// La UI (autocompletado) inserta el token al elegir un usuario; el render lo
// reconoce con el MISMO patrón y lo pinta como chip/enlace al perfil.

import { headers } from "next/headers";
import { NotificationType } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/server/notifications";

// Patrón del token `@[name](id)`. `name` = sin ']' (lazy). `id` = sin ')' ni
// espacios. La `g` permite extraer todas las ocurrencias del contenido.
const MENTION_TOKEN = /@\[[^\]]+?\]\(([^)\s]+)\)/g;

/**
 * Extrae los `userId` de TODOS los tokens `@[name](id)` de `content`.
 * Deduplica preservando el orden de primera aparición. NO valida contra BD
 * (eso lo hace `resolveMentionedUserIds`): aquí solo se parsea la sintaxis.
 */
export function parseMentions(content: string): string[] {
  if (!content) return [];
  const ids = new Set<string>();
  // matchAll con regex global; el grupo 1 es el id.
  for (const match of content.matchAll(MENTION_TOKEN)) {
    const id = match[1];
    if (id) ids.add(id);
  }
  return [...ids];
}

/**
 * Filtra una lista de ids dejando SOLO los que existen como usuarios reales.
 * Devuelve el subconjunto existente (preserva el orden de entrada). Es la
 * validación que convierte "ids que aparecen en el texto" en "menciones
 * legítimas": jamás se notifica a un id que no exista en `user`.
 */
export async function resolveMentionedUserIds(
  candidateIds: string[],
): Promise<string[]> {
  if (candidateIds.length === 0) return [];
  const found = await prisma.user.findMany({
    where: { id: { in: candidateIds } },
    select: { id: true },
  });
  const existing = new Set(found.map((u) => u.id));
  return candidateIds.filter((id) => existing.has(id));
}

/**
 * Atajo: parsea el contenido y devuelve los ids de usuarios REALES mencionados,
 * EXCLUYENDO al autor (no hay auto-menciones). Resultado deduplicado.
 *
 * Best-effort por diseño en los llamadores: si esto falla, la creación del
 * post/mensaje NO debe romperse (el llamador envuelve en try/catch).
 */
export async function extractValidMentionIds(
  content: string,
  excludeUserId: string,
): Promise<string[]> {
  const parsed = parseMentions(content).filter((id) => id !== excludeUserId);
  if (parsed.length === 0) return [];
  return resolveMentionedUserIds(parsed);
}

// ── Crear menciones + notificar (al crear contenido) ─────────────────────────

/**
 * Procesa las menciones de un POST recién creado: parsea el contenido, valida
 * los ids contra BD, excluye al autor, crea las filas `Mention(postId)` y
 * notifica MENTION a cada mencionado.
 *
 * BEST-EFFORT TOTAL: cualquier fallo se traga (no lanza). Las menciones y sus
 * notificaciones son secundarias: jamás deben tumbar la creación del post. Por
 * eso el cuerpo entero va en try/catch y devuelve `void`.
 *
 * Dedupe a nivel de BD: `createMany({ skipDuplicates })` + el índice único
 * parcial (postId, mentionedUserId) evitan filas repetidas si se reintenta.
 *
 * Nota sobre REPLY+MENTION al mismo usuario: si el autor del post padre también
 * está mencionado en la respuesta, recibirá DOS notificaciones (una REPLY desde
 * `createPost` y una MENTION desde aquí). Es intencionado y simple: son eventos
 * semánticamente distintos. NO se duplica MENTION (createNotification no dedup,
 * pero solo lo llamamos una vez por mencionado único).
 */
export async function createPostMentions(
  postId: string,
  content: string,
  authorId: string,
): Promise<void> {
  try {
    const mentionedIds = await extractValidMentionIds(content, authorId);
    if (mentionedIds.length === 0) return;

    await prisma.mention.createMany({
      data: mentionedIds.map((mentionedUserId) => ({
        postId,
        mentionedUserId,
      })),
      skipDuplicates: true,
    });

    await Promise.all(
      mentionedIds.map((mentionedUserId) =>
        createNotification({
          userId: mentionedUserId,
          actorId: authorId,
          type: NotificationType.MENTION,
          postId,
        }),
      ),
    );
  } catch {
    // Secundario: nunca propaga el fallo a la creación del post.
  }
}

/**
 * Procesa las menciones de un MENSAJE de chat recién creado. Igual que
 * `createPostMentions` pero:
 *   - Solo menciona a usuarios que sean MIEMBROS de la conversación (se pasa el
 *     conjunto `memberIds`, ya resuelto y verificado por el llamador). Un id
 *     mencionado que no sea miembro se DESCARTA (no se crea Mention ni notif):
 *     no se puede usar el chat para notificar a usuarios arbitrarios.
 *   - Crea `Mention(messageId)` y notifica MENTION (sin postId).
 *
 * `createNotification` no recibe `postId` aquí: la notificación MENTION de chat
 * queda asociada al actor/destinatario (la UI puede enrutar a la conversación
 * por el contexto del actor si lo necesita en una fase posterior).
 *
 * BEST-EFFORT TOTAL: cualquier fallo se traga; jamás tumba el envío del mensaje.
 */
export async function createMessageMentions(
  messageId: string,
  content: string,
  senderId: string,
  memberIds: string[],
): Promise<void> {
  try {
    const valid = await extractValidMentionIds(content, senderId);
    if (valid.length === 0) return;

    // Restricción de membresía: solo miembros de la conversación.
    const memberSet = new Set(memberIds);
    const mentionedIds = valid.filter((id) => memberSet.has(id));
    if (mentionedIds.length === 0) return;

    await prisma.mention.createMany({
      data: mentionedIds.map((mentionedUserId) => ({
        messageId,
        mentionedUserId,
      })),
      skipDuplicates: true,
    });

    await Promise.all(
      mentionedIds.map((mentionedUserId) =>
        createNotification({
          userId: mentionedUserId,
          actorId: senderId,
          type: NotificationType.MENTION,
        }),
      ),
    );
  } catch {
    // Secundario: nunca propaga el fallo al envío del mensaje.
  }
}

// ── Autocompletado ───────────────────────────────────────────────────────────

/** Datos mínimos para el dropdown de autocompletado de menciones. */
export type MentionableUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
};

const MENTIONABLE_LIMIT = 8;

async function getViewerIdOrNull(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

/**
 * Busca usuarios mencionables para el autocompletado.
 *
 *   - Exige SESIÓN (sin sesión → []). No filtra datos sensibles: solo devuelve
 *     id + datos públicos de perfil (displayName/avatar/jobTitle).
 *   - Si `conversationId` viene (mención en chat): restringe los resultados a
 *     los MIEMBROS de esa conversación, y SOLO si el viewer también es miembro
 *     (si no lo es, devuelve [] — no se filtran miembros de conversaciones
 *     ajenas). Así nunca se puede autocompletar/mencionar a alguien fuera de la
 *     conversación.
 *   - Sin `conversationId` (mención en feed): busca entre TODOS los usuarios por
 *     `displayName` (ILIKE, case-insensitive), ordenado alfabéticamente.
 *   - Query vacía → []. Límite por defecto 8.
 *
 * Nota: usamos un ILIKE simple por `displayName` (no FTS) porque el
 * autocompletado se dispara letra a letra y necesita coincidencias por PREFIJO
 * parciales ("an" → "Ana"), algo que el FTS por lexemas español no ofrece bien.
 */
export async function searchMentionableUsers(
  q: string,
  opts?: { conversationId?: string },
): Promise<MentionableUser[]> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) return [];

  const query = q.trim();
  if (query.length === 0) return [];

  const conversationId = opts?.conversationId;

  // Restricción de membresía (chat): el viewer debe pertenecer a la
  // conversación y los candidatos también. Resolvemos el conjunto permitido.
  let allowedUserIds: string[] | null = null;
  if (conversationId) {
    const members = await prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);
    // El viewer debe ser miembro; si no, no revelamos a nadie.
    if (!memberIds.includes(viewerId)) return [];
    allowedUserIds = memberIds;
    if (allowedUserIds.length === 0) return [];
  }

  const profiles = await prisma.profile.findMany({
    where: {
      displayName: { contains: query, mode: "insensitive" },
      ...(allowedUserIds ? { userId: { in: allowedUserIds } } : {}),
    },
    orderBy: { displayName: "asc" },
    take: MENTIONABLE_LIMIT,
    select: {
      userId: true,
      displayName: true,
      avatarUrl: true,
      jobTitle: true,
    },
  });

  return profiles.map((p) => ({
    id: p.userId,
    displayName: p.displayName,
    avatarUrl: p.avatarUrl,
    jobTitle: p.jobTitle,
  }));
}
