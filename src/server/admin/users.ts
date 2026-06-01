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

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  banUserSchema,
  listUsersSchema,
  setUserRoleSchema,
  userIdSchema,
} from "@/lib/validations/admin";
import { requireAdmin } from "@/server/authz";
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
