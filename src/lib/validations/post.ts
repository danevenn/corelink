import { z } from "zod";

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

// cuid() de Prisma para ids relacionales (channelId, parentId, postId).
const cuid = z.cuid("Identificador no válido.");

// Crear post: raíz (channelId opcional) o respuesta (parentId presente).
export const createPostSchema = z.object({
  content: postContent,
  channelId: cuid.optional(),
  parentId: cuid.optional(),
});

// Responder: wrapper semántico; parentId obligatorio.
export const replyToPostSchema = z.object({
  parentId: cuid,
  content: postContent,
});

// Editar: solo el contenido es mutable.
export const editPostSchema = z.object({
  id: cuid,
  content: postContent,
});

// Borrar: solo el id.
export const deletePostSchema = z.object({
  id: cuid,
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type ReplyToPostInput = z.infer<typeof replyToPostSchema>;
export type EditPostInput = z.infer<typeof editPostSchema>;
export type DeletePostInput = z.infer<typeof deletePostSchema>;
