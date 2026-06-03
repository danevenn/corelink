// Helper de SESIÓN para tests de integración.
//
// Todas las Server Actions resuelven al usuario actual con
// `auth.api.getSession({ headers })`. Aquí espiamos ESA función (y solo esa) para
// devolver una sesión sintética controlable, dejando intacto el resto de
// `auth.api` (createUser/setRole/banUser…), que los tests de admin SÍ usan de
// verdad contra la BD de test.
//
// Uso:
//   await runAs({ id, role }, async () => { ... acción bajo este usuario ... });
//   setCurrentUser(null)  // simula "anónimo / sin sesión"
//
// `getViewer()` lee `user.role`; `getViewerIdOrNull()` lee `user.id`. La sesión
// mínima que devolvemos cubre ambos.

import { vi } from "vitest";
import { auth } from "@/lib/auth";

export type TestUser = {
  id: string;
  role?: "user" | "moderator" | "admin";
};

let currentUser: TestUser | null = null;

/** Fija el usuario actual de la sesión sintética (o null para "sin sesión"). */
export function setCurrentUser(user: TestUser | null): void {
  currentUser = user;
}

/**
 * Instala el espía sobre `auth.api.getSession`. Idempotente: llamarlo varias
 * veces no apila espías. Se invoca una vez en el setup de integración.
 */
export function installSessionSpy(): void {
  vi.spyOn(auth.api, "getSession").mockImplementation(async () => {
    if (!currentUser) return null;
    // Forma mínima que consumen authz.getViewer y los helpers
    // getViewerIdOrNull/requireViewerId: { user: { id, role } }.
    return {
      user: { id: currentUser.id, role: currentUser.role ?? "user" },
      session: { id: `test-session-${currentUser.id}` },
      // biome-ignore lint/suspicious/noExplicitAny: sesión sintética parcial; las acciones solo leen user.id/user.role.
    } as any;
  });
}

/** Ejecuta `fn` con el usuario indicado como sesión activa, y restaura después. */
export async function runAs<T>(
  user: TestUser,
  fn: () => Promise<T>,
): Promise<T> {
  const previous = currentUser;
  currentUser = user;
  try {
    return await fn();
  } finally {
    currentUser = previous;
  }
}
