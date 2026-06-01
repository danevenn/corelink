import { z } from "zod";
import { attachmentsInputSchema } from "@/lib/validations/media";

// Esquemas zod del dominio "chat / mensajería" (Fase 8a).
// Validan TODO lo que entra al servidor desde las Server Actions de chat antes
// de tocar la capa de datos. Fuente de verdad de los límites de mensaje.

const MESSAGE_CONTENT_MAX = 4000;
const GROUP_NAME_MIN = 1;
const GROUP_NAME_MAX = 100;
const GROUP_MAX_MEMBERS = 100;

// Contenido OPCIONAL a nivel de campo (Fase 9a): un mensaje puede ir SOLO con
// imágenes. La regla "content o al menos un adjunto" se aplica con un refine a
// nivel de objeto en `sendMessageSchema`. Se normaliza con trim.
const messageContentOptional = z
  .string()
  .trim()
  .max(
    MESSAGE_CONTENT_MAX,
    `El mensaje no puede superar ${MESSAGE_CONTENT_MAX} caracteres.`,
  )
  .optional();

// cuid() de Prisma para ids de dominio (conversationId).
const cuid = z.cuid("Identificador no válido.");

// Los User.id de Better Auth son nanoid de 32 chars (string opaco), NO cuid.
// Validamos como string no vacío y acotado, sin formato cuid.
const userId = z
  .string()
  .trim()
  .min(1, "Identificador de usuario no válido.")
  .max(64, "Identificador de usuario no válido.");

const groupName = z
  .string()
  .trim()
  .min(GROUP_NAME_MIN, "El nombre del grupo no puede estar vacío.")
  .max(
    GROUP_NAME_MAX,
    `El nombre del grupo no puede superar ${GROUP_NAME_MAX} caracteres.`,
  );

// Abrir/encontrar un DM 1:1 con otro usuario.
export const getOrCreateDirectSchema = z.object({
  otherUserId: userId,
});

// Crear un grupo: nombre + al menos un miembro además del creador. Sin
// duplicados en memberIds (la action de todos modos deduplica y excluye al
// creador, pero validamos forma mínima aquí).
export const createGroupSchema = z.object({
  name: groupName,
  memberIds: z
    .array(userId)
    .min(1, "Añade al menos un miembro al grupo.")
    .max(GROUP_MAX_MEMBERS, "Demasiados miembros."),
});

// Enviar mensaje a una conversación. Permite mensaje SOLO-imagen: debe haber
// contenido no vacío O al menos un adjunto (refine a nivel de objeto).
export const sendMessageSchema = z
  .object({
    conversationId: cuid,
    content: messageContentOptional,
    attachments: attachmentsInputSchema,
  })
  .refine(
    (data) =>
      (!!data.content && data.content.length > 0) ||
      (!!data.attachments && data.attachments.length > 0),
    {
      message: "Escribe un mensaje o adjunta al menos un archivo.",
      path: ["content"],
    },
  );

// Marcar conversación como leída / publicar typing: solo el id.
export const conversationIdSchema = z.object({
  conversationId: cuid,
});

export type GetOrCreateDirectInput = z.infer<typeof getOrCreateDirectSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ConversationIdInput = z.infer<typeof conversationIdSchema>;
