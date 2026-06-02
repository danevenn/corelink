"use server";

// Server Actions de GESTIÓN DE USUARIOS y ROLES (Fase 10a) — solo ADMIN.
//
// Toda action re-verifica el rol en servidor con `requireAdmin()` (defensa en
// profundidad: nunca confiamos en que la UI oculte algo) ANTES de tocar nada.
//
// Para mutar usuarios (rol, baneo, borrado) usamos la API server del plugin
// `admin` de Better Auth (`auth.api.setRole/banUser/unbanUser/removeUser`) en
// lugar de manipular las columnas `role`/`banned`/... a mano: así respetamos su
// lógica (revocar sesiones al banear, cascada de borrado, etc.). Esas llamadas
// requieren `headers: await headers()` para identificar la sesión del admin que
// las invoca (el plugin re-comprueba permisos internamente).
//
// Contrato consistente con el resto del servidor (`post-actions.ts`):
// `ActionResult<T>` serializable — nunca se lanza para el flujo normal.

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  banUserSchema,
  createEmployeeSchema,
  listUsersSchema,
  setUserRoleSchema,
  userIdSchema,
} from "@/lib/validations/admin";
import { isAdmin, requireAdmin, requireModerator } from "@/server/authz";
import type { ActionResult } from "@/server/post-actions";

const ADMIN_PATH = "/admin";

// ── Tipos de retorno (fuente de verdad para el panel) ───────────────────────

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  /** Nombre mostrado del Profile (cae a name/email si no hay perfil). */
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "moderator" | "admin";
  banned: boolean;
  banReason: string | null;
  banExpires: Date | null;
  isAnonymous: boolean;
  createdAt: Date;
  /** Nº de posts (raíz + respuestas) del usuario. */
  postCount: number;
};

export type AdminUsersPage = {
  users: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
  /** ¿Hay una página siguiente? (offset + limit < total). */
  hasMore: boolean;
};

const DEFAULT_LIMIT = 25;

function normalizeRole(
  raw: string | null | undefined,
): "user" | "moderator" | "admin" {
  if (raw === "admin" || raw === "moderator") return raw;
  return "user";
}

// ── Alta de empleados (R1) ───────────────────────────────────────────────────

export type CreatedEmployee = {
  userId: string;
  email: string;
  /** Contraseña temporal en claro: la UI debe mostrarla UNA sola vez. */
  temporaryPassword: string;
};

/**
 * Genera una contraseña temporal segura (entropía alta, sin caracteres
 * ambiguos). ~16 chars de un alfabeto de 58 → suficiente para un secreto de un
 * solo uso que el empleado cambiará en su primer login.
 */
function generateTemporaryPassword(): string {
  // Alfabeto sin 0/O/1/l/I para que sea legible al dictarlo/copiarlo.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const length = 16;
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    // `bytes[i]` está acotado por `noUncheckedIndexedAccess`; nunca undefined
    // porque i < length === bytes.length.
    out += alphabet[(bytes[i] as number) % alphabet.length];
  }
  return out;
}

/**
 * Da de alta una cuenta de EMPLEADO. Disponible para STAFF (admin Y moderator),
 * vía `requireModerator()` (defensa en profundidad: nunca confiamos en la UI).
 *
 * Reglas de rol:
 *   - El rol asignable se valida a `user | moderator` (zod). Crear ADMINS por
 *     esta vía NO está permitido a nadie: la promoción a admin va por
 *     `setUserRole` (solo-admin). Si un moderador intentara colar `moderator`,
 *     se le permite (es staff de su mismo nivel); lo que se prohíbe a todos aquí
 *     es `admin`, ya cerrado por el schema.
 *   - Como salvaguarda extra y explícita: un MODERADOR no puede crear otros
 *     moderadores (evita escalada lateral de privilegios). Solo ADMIN puede dar
 *     de alta con rol `moderator`. Un moderador queda limitado a crear `user`.
 *
 * Implementación: usamos `auth.api.createUser` del plugin admin SIN headers (es
 * una llamada server-side de confianza, ya autorizada por `requireModerator()`).
 * Llamarla CON headers exigiría el permiso nativo `user:["create"]` del plugin,
 * que por config (`adminRoles:["admin"]`) solo tiene `admin` — bloquearía a los
 * moderadores. `createUser` NO pasa por el flujo de sign-up, así que NO le afecta
 * `disableSignUp`. Marcamos `mustChangePassword=true` y creamos el Profile.
 *
 * Devuelve la contraseña temporal en claro para mostrarla UNA vez. NO se envían
 * emails (no hay servicio externo en este entorno).
 */
export async function createEmployee(
  input: unknown,
): Promise<ActionResult<CreatedEmployee>> {
  const gate = await requireModerator();
  if (!("id" in gate)) return gate;

  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const { email, name, role, departmentId } = parsed.data;

  // Salvaguarda de escalada: solo un ADMIN puede crear con rol `moderator`.
  // Un moderador queda limitado a `user`. (Crear `admin` ya está prohibido a
  // todos por el schema.)
  if (role === "moderator" && !isAdmin(gate.role)) {
    return {
      ok: false,
      error: {
        message:
          "Solo un administrador puede dar de alta empleados con rol de moderador.",
      },
    };
  }

  // Si viene departmentId, debe ser un canal de tipo DEPARTMENT existente.
  if (departmentId) {
    const dept = await prisma.channel.findFirst({
      where: { id: departmentId, type: "DEPARTMENT" },
      select: { id: true },
    });
    if (!dept) {
      return {
        ok: false,
        error: { message: "El departamento indicado no existe." },
      };
    }
  }

  const temporaryPassword =
    parsed.data.temporaryPassword ?? generateTemporaryPassword();

  try {
    const created = await auth.api.createUser({
      body: {
        email,
        name,
        password: temporaryPassword,
        // El plugin acepta el string de rol tal cual (no valida contra
        // `adminRoles` si no hay mapa `roles` custom). Ya acotado por zod.
        role: role as "user",
      },
    });

    const userId = created.user.id;

    // `mustChangePassword` NO es un additionalField de Better Auth, así que el
    // adapter no lo persiste vía `createUser`. Lo marcamos con Prisma directo
    // (fuente de verdad de la columna), junto con el Profile de dominio.
    await prisma.user.update({
      where: { id: userId },
      data: { mustChangePassword: true },
    });

    // Perfil de dominio (displayName = name; departamento opcional).
    await prisma.profile.create({
      data: {
        userId,
        displayName: name,
        departmentId: departmentId ?? null,
      },
    });

    revalidatePath(ADMIN_PATH);
    return { ok: true, data: { userId, email, temporaryPassword } };
  } catch (err) {
    // El plugin lanza USER_ALREADY_EXISTS si el email ya está en uso.
    const message =
      err instanceof Error &&
      /already exists|use another email/i.test(err.message)
        ? "Ya existe una cuenta con ese correo."
        : "No se pudo crear el empleado.";
    return { ok: false, error: { message } };
  }
}

/**
 * Lista usuarios con rol, estado de baneo, perfil (displayName/avatar) y conteo
 * de posts, paginados por página/offset y con búsqueda por nombre o email.
 * Solo ADMIN.
 *
 * Estrategia: usamos `auth.api.listUsers` (plugin admin) para la paginación y
 * la búsqueda nativas (limit/offset/searchValue), y enriquecemos con Profile +
 * conteo de posts vía una ÚNICA consulta Prisma sobre los ids de la página
 * (anti-N+1: un `findMany` + un `groupBy`, no por-fila).
 */
export async function listUsers(
  input?: unknown,
): Promise<ActionResult<AdminUsersPage>> {
  const gate = await requireAdmin();
  if (!("id" in gate)) return gate;

  const parsed = listUsersSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  const page = parsed.data.page ?? 1;
  const limit = parsed.data.limit ?? DEFAULT_LIMIT;
  const offset = (page - 1) * limit;
  const search = parsed.data.search;

  try {
    const result = await auth.api.listUsers({
      headers: await headers(),
      query: {
        limit,
        offset,
        sortBy: "createdAt",
        sortDirection: "desc",
        ...(search
          ? {
              searchValue: search,
              searchField: "name",
              searchOperator: "contains",
            }
          : {}),
      },
    });

    const baseUsers = result.users ?? [];
    const ids = baseUsers.map((u) => u.id);

    // Enriquecimiento en 2 queries acotadas a los ids de la página.
    const [profiles, postCounts] = await Promise.all([
      prisma.profile.findMany({
        where: { userId: { in: ids } },
        select: { userId: true, displayName: true, avatarUrl: true },
      }),
      prisma.post.groupBy({
        by: ["authorId"],
        where: { authorId: { in: ids } },
        _count: { _all: true },
      }),
    ]);

    const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
    const countByUser = new Map(
      postCounts.map((c) => [c.authorId, c._count._all]),
    );

    const users: AdminUserRow[] = baseUsers.map((u) => {
      const profile = profileByUser.get(u.id);
      const banExpiresRaw = (u as { banExpires?: Date | string | null })
        .banExpires;
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        displayName: profile?.displayName ?? u.name ?? u.email,
        avatarUrl: profile?.avatarUrl ?? null,
        role: normalizeRole((u as { role?: string | null }).role),
        banned: (u as { banned?: boolean | null }).banned ?? false,
        banReason: (u as { banReason?: string | null }).banReason ?? null,
        banExpires: banExpiresRaw ? new Date(banExpiresRaw) : null,
        isAnonymous:
          (u as { isAnonymous?: boolean | null }).isAnonymous ?? false,
        createdAt: new Date(u.createdAt),
        postCount: countByUser.get(u.id) ?? 0,
      };
    });

    const total = result.total ?? users.length;

    return {
      ok: true,
      data: {
        users,
        total,
        page,
        limit,
        hasMore: offset + users.length < total,
      },
    };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo listar los usuarios." },
    };
  }
}

/**
 * Cambia el rol de plataforma de un usuario (user|moderator|admin). Solo ADMIN.
 *
 * Salvaguarda: un admin NO puede AUTO-DEGRADARSE (quitarse a sí mismo el rol
 * admin). Esto evita el caso de "quedarse sin ningún admin" por descuido y
 * además impide que un admin se bloquee a sí mismo el panel. Para degradar a un
 * admin, otro admin debe hacerlo.
 */
export async function setUserRole(
  userId: string,
  role: "user" | "moderator" | "admin",
): Promise<ActionResult<{ userId: string; role: string }>> {
  const gate = await requireAdmin();
  if (!("id" in gate)) return gate;

  const parsed = setUserRoleSchema.safeParse({ userId, role });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  // No auto-degradación: si el admin actual intenta dejar de ser admin.
  if (parsed.data.userId === gate.id && parsed.data.role !== "admin") {
    return {
      ok: false,
      error: {
        message:
          "No puedes quitarte a ti mismo el rol de administrador. Pide a otro admin que lo haga.",
      },
    };
  }

  try {
    await auth.api.setRole({
      headers: await headers(),
      // El tipo inferido del plugin admite solo los roles por defecto
      // ("admin"|"user") porque no le pasamos un mapa `roles` custom. En runtime
      // acepta cualquier string (no valida contra `opts.roles` si está ausente)
      // y nuestro `moderator` es un rol de dominio válido (ver `auth.ts`). El
      // valor ya está acotado por zod (`appRoleSchema`); el cast solo concilia
      // el tipo demasiado estrecho del plugin.
      body: {
        userId: parsed.data.userId,
        role: parsed.data.role as "admin" | "user",
      },
    });

    revalidatePath(ADMIN_PATH);
    return {
      ok: true,
      data: { userId: parsed.data.userId, role: parsed.data.role },
    };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo cambiar el rol del usuario." },
    };
  }
}

/**
 * Banea a un usuario (revoca sus sesiones). Solo ADMIN. Impide auto-baneo.
 * `expiresInDays` ausente = baneo permanente.
 */
export async function banUser(
  userId: string,
  options?: { reason?: string; expiresInDays?: number },
): Promise<ActionResult<{ userId: string }>> {
  const gate = await requireAdmin();
  if (!("id" in gate)) return gate;

  const parsed = banUserSchema.safeParse({
    userId,
    reason: options?.reason,
    expiresInDays: options?.expiresInDays,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  if (parsed.data.userId === gate.id) {
    return {
      ok: false,
      error: { message: "No puedes banearte a ti mismo." },
    };
  }

  try {
    await auth.api.banUser({
      headers: await headers(),
      body: {
        userId: parsed.data.userId,
        ...(parsed.data.reason ? { banReason: parsed.data.reason } : {}),
        // El plugin admin espera SEGUNDOS hasta la expiración.
        ...(parsed.data.expiresInDays
          ? { banExpiresIn: parsed.data.expiresInDays * 24 * 60 * 60 }
          : {}),
      },
    });

    revalidatePath(ADMIN_PATH);
    return { ok: true, data: { userId: parsed.data.userId } };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo banear al usuario." },
    };
  }
}

/** Quita el baneo de un usuario. Solo ADMIN. */
export async function unbanUser(
  userId: string,
): Promise<ActionResult<{ userId: string }>> {
  const gate = await requireAdmin();
  if (!("id" in gate)) return gate;

  const parsed = userIdSchema.safeParse({ userId });
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
    await auth.api.unbanUser({
      headers: await headers(),
      body: { userId: parsed.data.userId },
    });

    revalidatePath(ADMIN_PATH);
    return { ok: true, data: { userId: parsed.data.userId } };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo desbanear al usuario." },
    };
  }
}

/**
 * Elimina una cuenta y TODO su contenido. Solo ADMIN. Impide auto-eliminación.
 *
 * Usa `auth.api.removeUser` (plugin admin), que borra el User y sus sesiones;
 * el resto del contenido de dominio (posts, respuestas, reacciones, mensajes,
 * follows, menciones, notificaciones, miembros de conversación, adjuntos) cae
 * por los `onDelete: Cascade` del schema Prisma. El plugin ya rechaza el
 * auto-borrado, pero lo comprobamos también aquí para devolver nuestro mensaje.
 */
export async function deleteUser(
  userId: string,
): Promise<ActionResult<{ userId: string }>> {
  const gate = await requireAdmin();
  if (!("id" in gate)) return gate;

  const parsed = userIdSchema.safeParse({ userId });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  if (parsed.data.userId === gate.id) {
    return {
      ok: false,
      error: { message: "No puedes eliminar tu propia cuenta." },
    };
  }

  try {
    await auth.api.removeUser({
      headers: await headers(),
      body: { userId: parsed.data.userId },
    });

    revalidatePath(ADMIN_PATH);
    return { ok: true, data: { userId: parsed.data.userId } };
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo eliminar al usuario." },
    };
  }
}
