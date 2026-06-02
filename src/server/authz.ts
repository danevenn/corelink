// Autorización en servidor (Fase 6a) — RBAC user / moderator / admin.
//
// Capa de autorización reutilizable que se consumirá en:
//   - Fase 6b: acción de marcar un post como "oficial" (solo staff).
//   - Fase 10: panel de moderación.
//
// Decisión de modelo (ver `src/lib/auth.ts`): el rol vive en `user.role`
// (campo del plugin admin de Better Auth). `admin` y `moderator` son "staff"
// con capacidad de moderar contenido; `user` (default) no. El plugin admin
// reserva sus poderes nativos (banear, impersonar) solo a `admin`.
//
// Contrato de error consistente con `src/server/post-actions.ts`: las acciones
// no lanzan para el flujo normal de autorización; devuelven un resultado
// serializable `{ ok: false, error: { message } }`.

import { headers } from "next/headers";
import { type AppRole, auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/** Resultado de denegación, alineado con `ActionResult` de post-actions. */
export type AuthzDenied = { ok: false; error: { message: string } };

/** Identidad mínima del usuario actual para decisiones de autorización. */
export type Viewer = {
  id: string;
  role: AppRole;
  isAnonymous: boolean;
};

const STAFF_ROLES: ReadonlySet<AppRole> = new Set<AppRole>([
  "admin",
  "moderator",
]);

/**
 * Normaliza el `role` crudo del User al conjunto cerrado `AppRole`.
 * Cualquier valor desconocido o ausente cae al menor privilegio (`user`),
 * cumpliendo el principio de "rol por defecto = más restrictivo".
 */
function normalizeRole(raw: string | null | undefined): AppRole {
  if (raw === "admin" || raw === "moderator") return raw;
  return "user";
}

/**
 * Devuelve la identidad + rol del usuario actual, o `null` si no hay sesión.
 * Los usuarios anónimos ("Entrar como invitado") siempre son rol `user`.
 *
 * El rol se lee de la sesión de Better Auth si está disponible; si no, se
 * consulta la tabla `user` como fuente de verdad.
 */
export async function getViewer(): Promise<Viewer | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { user } = session;
  // R1: el plugin `anonymous` se eliminó, así que `isAnonymous` ya no está en el
  // tipo de la sesión (la columna persiste en BD para datos antiguos). Leemos de
  // forma defensiva; cualquier sesión nueva es no-anónima.
  const isAnonymous =
    (user as { isAnonymous?: boolean | null }).isAnonymous ?? false;

  // El plugin admin expone `role` en el user de la sesión; lo tomamos de ahí
  // y, por seguridad, lo normalizamos. Los anónimos (legado) nunca son staff.
  const sessionRole = (user as { role?: string | null }).role;
  const role = isAnonymous ? "user" : normalizeRole(sessionRole);

  return { id: user.id, role, isAnonymous };
}

/** True si el rol puede moderar contenido (staff: admin o moderator). */
export function canModerate(role: AppRole): boolean {
  return STAFF_ROLES.has(role);
}

/** True si el rol es admin de la plataforma. */
export function isAdmin(role: AppRole): boolean {
  return role === "admin";
}

/**
 * Exige que el usuario actual sea staff (admin o moderator).
 * Devuelve el `Viewer` autorizado, o un `AuthzDenied` serializable cuando
 * no hay sesión o el rol es insuficiente. Nunca lanza para el flujo normal.
 *
 * Uso típico en una Server Action:
 *   const gate = await requireModerator();
 *   if (!("id" in gate)) return gate; // gate es AuthzDenied
 *   // ... gate.id / gate.role disponibles
 */
export async function requireModerator(): Promise<Viewer | AuthzDenied> {
  const viewer = await getViewer();
  if (!viewer) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }
  if (!canModerate(viewer.role)) {
    return {
      ok: false,
      error: { message: "No tienes permisos de moderación." },
    };
  }
  return viewer;
}

/**
 * Exige que el usuario actual sea admin de la plataforma.
 * Mismo contrato que `requireModerator`.
 */
export async function requireAdmin(): Promise<Viewer | AuthzDenied> {
  const viewer = await getViewer();
  if (!viewer) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }
  if (!isAdmin(viewer.role)) {
    return {
      ok: false,
      error: { message: "Requiere permisos de administrador." },
    };
  }
  return viewer;
}

/**
 * Lee el rol de un usuario directamente de la BD (fuente de verdad).
 * Útil en seeds, scripts y verificación donde no hay sesión HTTP.
 */
export async function getUserRole(userId: string): Promise<AppRole> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return normalizeRole(user?.role);
}
