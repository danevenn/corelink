"use server";

// Server Action de autocompletado de menciones (@usuario).
//
// Thin wrapper `"use server"` sobre `searchMentionableUsers` (server-only) para
// que el autocompletado de la UI (fase siguiente) lo invoque desde un client
// island — mismo patrón que `searchUsersAction` en chat-actions.ts.
//
// La autorización (sesión obligatoria) y la restricción de membresía cuando hay
// `conversationId` viven en `searchMentionableUsers`; aquí solo validamos forma.

import { z } from "zod";
import {
  type MentionableUser,
  searchMentionableUsers,
} from "@/server/mentions";

const schema = z.object({
  q: z.string().max(100),
  // conversationId opcional (cuid) → restringe a miembros de la conversación.
  conversationId: z.cuid().optional(),
});

/**
 * Busca usuarios mencionables para el dropdown de autocompletado.
 *   - Sin `conversationId`: busca entre todos los usuarios (menciones en feed).
 *   - Con `conversationId`: solo miembros de esa conversación (menciones en
 *     chat), y solo si el viewer es miembro.
 * Input inválido o sin sesión → lista vacía (nunca lanza).
 */
export async function searchMentionableUsersAction(input: {
  q: string;
  conversationId?: string;
}): Promise<MentionableUser[]> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return [];
  const { q, conversationId } = parsed.data;
  return searchMentionableUsers(q, { conversationId });
}
