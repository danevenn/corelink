import { z } from "zod";
import { attachmentsInputSchema } from "@/lib/validations/media";

// Esquemas zod del dominio "feed" (Fase 4a).
// Validan TODO lo que entra al servidor desde Server Actions antes de tocar
// la capa de datos. Fuente de verdad de los límites de contenido.

const POST_CONTENT_MIN = 1;
const POST_CONTENT_MAX = 5000;

// `content` se normaliza con trim; un post solo de espacios es inválido.
const postContent = z
  .string()
  .trim()
  .min(POST_CONTENT_MIN, "El contenido no puede estar vacío.")
  .max(
    POST_CONTENT_MAX,
    `El contenido no puede superar ${POST_CONTENT_MAX} caracteres.`,
  );

// Contenido OPCIONAL a nivel de campo (Fase 9a): un post puede ir SOLO con
// imágenes. La regla "content o al menos un adjunto" se aplica con un refine a
// nivel de objeto (ver `requireContentOrAttachments`). Se normaliza con trim.
const postContentOptional = z
  .string()
  .trim()
  .max(
    POST_CONTENT_MAX,
    `El contenido no puede superar ${POST_CONTENT_MAX} caracteres.`,
  )
  .optional();

// cuid() de Prisma para ids relacionales (channelId, parentId, postId).
const cuid = z.cuid("Identificador no válido.");

// Refine compartido: debe haber CONTENIDO no vacío O al menos un adjunto.
// Evita posts totalmente vacíos sin obligar a escribir texto si hay imagen.
function requireContentOrAttachments(data: {
  content?: string;
  attachments?: unknown[];
}): boolean {
  const hasContent = !!data.content && data.content.length > 0;
  const hasAttachments = !!data.attachments && data.attachments.length > 0;
  return hasContent || hasAttachments;
}

const CONTENT_OR_ATTACHMENT_MSG = {
  message: "Escribe algo o adjunta al menos un archivo.",
  path: ["content"],
};

// Crear post: raíz (channelId opcional) o respuesta (parentId presente).
export const createPostSchema = z
  .object({
    content: postContentOptional,
    channelId: cuid.optional(),
    parentId: cuid.optional(),
    attachments: attachmentsInputSchema,
  })
  .refine(requireContentOrAttachments, CONTENT_OR_ATTACHMENT_MSG);

// Responder: wrapper semántico; parentId obligatorio.
export const replyToPostSchema = z
  .object({
    parentId: cuid,
    content: postContentOptional,
    attachments: attachmentsInputSchema,
  })
  .refine(requireContentOrAttachments, CONTENT_OR_ATTACHMENT_MSG);

// Editar: solo el contenido es mutable.
export const editPostSchema = z.object({
  id: cuid,
  content: postContent,
});

// Borrar: solo el id.
export const deletePostSchema = z.object({
  id: cuid,
});

// Marcar/desmarcar oficial (Fase 6b). Autorización por rol (staff), no por
// autor: la action exige `requireModerator()`. Aquí solo validamos la forma.
export const setOfficialSchema = z.object({
  postId: cuid,
  isOfficial: z.boolean(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type ReplyToPostInput = z.infer<typeof replyToPostSchema>;
export type EditPostInput = z.infer<typeof editPostSchema>;
export type DeletePostInput = z.infer<typeof deletePostSchema>;
export type SetOfficialInput = z.infer<typeof setOfficialSchema>;
