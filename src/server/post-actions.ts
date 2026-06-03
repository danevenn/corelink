"use server";

// Server Actions del feed (Fase 4a).
//
// Contrato consistente: toda acción devuelve un resultado SERIALIZABLE
// discriminado `ActionResult<T>` — nunca se lanza una excepción para el flujo
// normal (validación, autorización, no encontrado). Los errores inesperados se
// capturan y se devuelven como `{ ok: false }` con mensaje genérico.
//
// Seguridad:
//   - Todas exigen sesión (Better Auth). Sin sesión → { ok: false }.
//   - Autorización: editPost filtra por authorId (un usuario no edita posts
//     ajenos). deletePost lo permite al AUTOR o al STAFF (admin/moderator) vía
//     `canModerate()` — la moderación (Fase 10a) puede retirar cualquier post.
//
// Revalidación: tras cada mutación se invalida la ruta del feed y la del hilo
// afectado con `revalidatePath` (Next 16, Node runtime).

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NotificationType } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createPostSchema,
  deletePostSchema,
  editPostSchema,
  replyToPostSchema,
} from "@/lib/validations/post";
import { canModerate, getViewer } from "@/server/authz";
import { createPostMentions } from "@/server/mentions";
import { createNotification } from "@/server/notifications";
import { deleteAttachmentsFromStorage } from "@/server/storage/gc";

// ── Contrato de resultado ───────────────────────────────────────────────────

export type ActionError = {
  message: string;
  /** Errores de validación por campo (zod flatten), si aplica. */
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };

export type CreatedPost = { id: string; parentId: string | null };

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getViewerIdOrNull(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

const FEED_PATH = "/feed";

function revalidateFeed(postId?: string | null): void {
  revalidatePath(FEED_PATH);
  if (postId) {
    revalidatePath(`${FEED_PATH}/${postId}`);
  }
}

/**
 * Reúne el id del post raíz a borrar y los de TODAS sus respuestas descendientes
 * (el cascade de `PostThread` arrastra el subárbol completo). Recorre nivel a
 * nivel con queries acotadas por `parentId IN (...)`, evitando recursión SQL.
 * Necesario para recoger las `key` de adjuntos de todo el subárbol ANTES de que
 * el cascade borre esas filas y perdamos la referencia al objeto en storage.
 */
async function collectThreadPostIds(rootId: string): Promise<string[]> {
  const all = [rootId];
  let frontier = [rootId];
  // El árbol de respuestas de un post de intranet es poco profundo; el bucle
  // converge rápido. Cota de seguridad por si hubiera datos patológicos.
  for (let depth = 0; frontier.length > 0 && depth < 64; depth++) {
    const children = await prisma.post.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((c) => c.id);
    all.push(...frontier);
  }
  return all;
}

// ── Acciones ────────────────────────────────────────────────────────────────

/**
 * Crea un post raíz (channelId opcional) o una respuesta (parentId presente).
 * El autor es siempre el usuario actual.
 */
export async function createPost(
  input: unknown,
): Promise<ActionResult<CreatedPost>> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }
  const { content, channelId, parentId, attachments } = parsed.data;

  try {
    // Si es respuesta, validamos que el padre exista y heredamos su canal
    // cuando no se especifica uno explícito. Guardamos el autor del padre para
    // notificarle (REPLY) tras crear la respuesta.
    let resolvedChannelId = channelId ?? null;
    let parentAuthorId: string | null = null;
    if (parentId) {
      const parent = await prisma.post.findUnique({
        where: { id: parentId },
        select: { id: true, channelId: true, authorId: true },
      });
      if (!parent) {
        return {
          ok: false,
          error: { message: "El post al que respondes no existe." },
        };
      }
      resolvedChannelId = channelId ?? parent.channelId;
      parentAuthorId = parent.authorId;
    } else if (channelId) {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { id: true },
      });
      if (!channel) {
        return { ok: false, error: { message: "El canal no existe." } };
      }
    }

    // Post + adjuntos en la MISMA operación (nested create). El zod garantiza
    // que hay content o al menos un adjunto; `content` cae a "" para satisfacer
    // la columna NOT NULL en posts solo-imagen. Cada Attachment queda ligado al
    // post (postId set, messageId null) cumpliendo el CHECK de exclusividad.
    const post = await prisma.post.create({
      data: {
        authorId: viewerId,
        content: content ?? "",
        channelId: resolvedChannelId,
        parentId: parentId ?? null,
        ...(attachments && attachments.length > 0
          ? {
              attachments: {
                create: attachments.map((a) => ({
                  url: a.url,
                  key: a.key,
                  mime: a.mime,
                  size: a.size,
                  width: a.width ?? null,
                  height: a.height ?? null,
                })),
              },
            }
          : {}),
      },
      select: { id: true, parentId: true },
    });

    // Notificación REPLY al autor del post padre (centralizada: no auto-notifica
    // y publica al bus de tiempo real). Best-effort; no bloquea la respuesta.
    if (parentAuthorId) {
      await createNotification({
        userId: parentAuthorId,
        actorId: viewerId,
        type: NotificationType.REPLY,
        postId: post.id,
      });
    }

    // MENTION (@[name](id)): parsea el contenido, valida los ids contra BD,
    // crea las filas Mention(postId) y notifica MENTION a cada mencionado
    // (excluye al autor). Best-effort interno: nunca tumba la creación del post.
    // Si el autor del padre además está mencionado, recibe REPLY y MENTION
    // (eventos distintos, intencionado).
    await createPostMentions(post.id, content ?? "", viewerId);

    revalidateFeed(parentId ?? post.id);
    return { ok: true, data: post };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo crear el post. Inténtalo de nuevo." },
    };
  }
}

/**
 * Responde a un post. Wrapper de `createPost` con parentId obligatorio.
 */
export async function replyToPost(
  parentId: string,
  content: string,
): Promise<ActionResult<CreatedPost>> {
  const parsed = replyToPostSchema.safeParse({ parentId, content });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }
  return createPost(parsed.data);
}

/**
 * Edita el contenido de un post. Solo el autor; marca `editedAt`.
 */
export async function editPost(
  id: string,
  content: string,
): Promise<ActionResult<CreatedPost>> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = editPostSchema.safeParse({ id, content });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  try {
    // Autorización a nivel de query: el WHERE incluye authorId, así un post
    // ajeno simplemente no coincide (updateMany count = 0).
    const result = await prisma.post.updateMany({
      where: { id: parsed.data.id, authorId: viewerId },
      data: { content: parsed.data.content, editedAt: new Date() },
    });

    if (result.count === 0) {
      return {
        ok: false,
        error: { message: "Post no encontrado o sin permiso para editarlo." },
      };
    }

    const post = await prisma.post.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, parentId: true },
    });
    revalidateFeed(post?.parentId ?? parsed.data.id);
    return {
      ok: true,
      data: { id: parsed.data.id, parentId: post?.parentId ?? null },
    };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo editar el post." },
    };
  }
}

/**
 * Borra un post/respuesta. Lo permite el AUTOR o el STAFF (admin/moderator):
 * la moderación (Fase 10a) puede retirar CUALQUIER post o respuesta, mientras
 * el autor conserva su capacidad de borrar lo suyo. El cascade del schema
 * arrastra respuestas, reacciones, menciones y adjuntos.
 */
export async function deletePost(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  // Usamos `getViewer()` (no solo el id) para conocer el ROL y decidir si es
  // staff. Misma fuente de verdad de autorización que el resto del servidor.
  const viewer = await getViewer();
  if (!viewer) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = deletePostSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  try {
    // Recuperamos parentId ANTES de borrar para revalidar el hilo correcto,
    // y confirmamos propiedad/permisos en el mismo paso.
    const target = await prisma.post.findUnique({
      where: { id: parsed.data.id },
      select: { authorId: true, parentId: true },
    });

    if (!target) {
      return { ok: false, error: { message: "Post no encontrado." } };
    }
    // Autorización: autor del post O staff de moderación. El staff puede borrar
    // cualquier post/respuesta; un usuario normal solo lo suyo.
    const isAuthor = target.authorId === viewer.id;
    if (!isAuthor && !canModerate(viewer.role)) {
      return {
        ok: false,
        error: { message: "No tienes permiso para borrar este post." },
      };
    }

    // GC: recogemos las `key` de los adjuntos del post Y de todas sus respuestas
    // descendientes ANTES del cascade (que borra esas filas de BD pero deja los
    // objetos físicos huérfanos en el storage). Tras borrar de BD, los limpiamos
    // best-effort.
    const threadIds = await collectThreadPostIds(parsed.data.id);
    const attachments = await prisma.attachment.findMany({
      where: { postId: { in: threadIds } },
      select: { key: true },
    });

    await prisma.post.delete({ where: { id: parsed.data.id } });

    // Best-effort: nunca rompe el borrado ya completado en BD.
    await deleteAttachmentsFromStorage(attachments.map((a) => a.key));

    revalidateFeed(target.parentId);
    return { ok: true, data: { id: parsed.data.id } };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo borrar el post." },
    };
  }
}
