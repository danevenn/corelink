import { z } from "zod";

// Esquemas zod del dominio "chat / mensajería" (Fase 8a).
// Validan TODO lo que entra al servidor desde las Server Actions de chat antes
// de tocar la capa de datos. Fuente de verdad de los límites de mensaje.

const MESSAGE_CONTENT_MIN = 1;
const MESSAGE_CONTENT_MAX = 4000;
const GROUP_NAME_MIN = 1;
const GROUP_NAME_MAX = 100;
const GROUP_MAX_MEMBERS = 100;

// `content` se normaliza con trim; un mensaje solo de espacios es inválido.
const messageContent = z
  .string()
  .trim()
  .min(MESSAGE_CONTENT_MIN, "El mensaje no puede estar vacío.")
  .max(
    MESSAGE_CONTENT_MAX,
    `El mensaje no puede superar ${MESSAGE_CONTENT_MAX} caracteres.`,
  );

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

// Enviar mensaje a una conversación.
export const sendMessageSchema = z.object({
  conversationId: cuid,
  content: messageContent,
});

// Marcar conversación como leída / publicar typing: solo el id.
export const conversationIdSchema = z.object({
  conversationId: cuid,
});

export type GetOrCreateDirectInput = z.infer<typeof getOrCreateDirectSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ConversationIdInput = z.infer<typeof conversationIdSchema>;
