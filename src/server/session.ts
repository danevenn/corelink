// Helper de sesión compartido (server-only).
//
// `getViewerIdOrNull` se repetía idéntico en múltiples Server Actions/módulos
// de servidor. Centralizado aquí como única fuente de verdad. Para datos del
// viewer más allá del id (perfil, rol), ver `@/server/viewer` y `@/server/authz`.

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/** Id del usuario de la sesión actual, o `null` si no hay sesión. */
export async function getViewerIdOrNull(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}
