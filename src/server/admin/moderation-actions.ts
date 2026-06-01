"use server";

// Wrapper "use server" MÍNIMO sobre `listRecentPosts` (Fase 10b) para poder
// paginar la cola de moderación DESDE EL CLIENTE (mismo patrón que
// `fetchNotificationsPage` en 7b). La lógica y la autorización (solo STAFF)
// viven en `moderation.ts`; aquí solo exponemos la lectura como Server Action.
// No reescribe nada de 10a.

import { listRecentPosts } from "@/server/admin/moderation";
import type { AuthzDenied } from "@/server/authz";
import type { FeedPage } from "@/server/posts";

export async function fetchRecentPosts(params?: {
  cursor?: string;
  limit?: number;
}): Promise<FeedPage | AuthzDenied> {
  return listRecentPosts(params);
}
