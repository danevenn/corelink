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
//   - Autorización a nivel de query: editPost/deletePost filtran por authorId,
//     de modo que un usuario no puede mutar posts ajenos.
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
import { createNotification } from "@/server/notifications";

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
                })),
              },
            }
          : {}),
      },
      select: { id: true, parentId: true },
    });

    // Notificación REPLY al autor del post padre (centralizada: no auto-notifica
    // y publica al bus de tiempo real). Best-effort; no bloquea la respuesta.
    //
    // MENTION (@usuario) queda PENDIENTE: aún no hay parsing de menciones en el
    // contenido. Cuando se implemente, este es el punto natural para, tras
    // extraer los @handles, llamar a `createNotification` con type MENTION por
    // cada mencionado (evitando duplicar con el REPLY al mismo autor).
    if (parentAuthorId) {
      await createNotification({
        userId: parentAuthorId,
        actorId: viewerId,
        type: NotificationType.REPLY,
        postId: post.id,
      });
    }

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
 * Borra un post. Solo el autor. El cascade del schema arrastra respuestas,
 * reacciones, menciones y adjuntos.
 */
export async function deletePost(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const viewerId = await getViewerIdOrNull();
  if (!viewerId) {
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
    // y confirmamos propiedad en el mismo paso.
    const target = await prisma.post.findUnique({
      where: { id: parsed.data.id },
      select: { authorId: true, parentId: true },
    });

    if (!target) {
      return { ok: false, error: { message: "Post no encontrado." } };
    }
    if (target.authorId !== viewerId) {
      return {
        ok: false,
        error: { message: "No tienes permiso para borrar este post." },
      };
    }

    await prisma.post.delete({ where: { id: parsed.data.id } });

    revalidateFeed(target.parentId);
    return { ok: true, data: { id: parsed.data.id } };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo borrar el post." },
    };
  }
}
