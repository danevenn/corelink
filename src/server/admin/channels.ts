"use server";

// Server Actions de GESTIÓN DE CANALES (Fase 10a) — solo ADMIN.
//
// Toda action re-verifica el rol con `requireAdmin()` (defensa en profundidad)
// antes de tocar la BD. Contrato `ActionResult<T>` serializable, como el resto.
//
// Borrado: NO se borran canales. Se ARCHIVAN (`archivedAt`): un canal archivado
// preserva sus posts (su `channelId` es SetNull, así borrarlo huérfanizaría
// posts) y desaparece de la nav/listados normales (ver `getChannels`/
// `getChannelBySlug` en `posts.ts`, que filtran `archivedAt: null`).

import { revalidatePath } from "next/cache";
import type { ChannelType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  channelIdSchema,
  createChannelSchema,
  updateChannelSchema,
} from "@/lib/validations/admin";
import { requireAdmin } from "@/server/authz";
import type { ActionResult } from "@/server/post-actions";

const ADMIN_PATH = "/admin";
const FEED_PATH = "/feed";

export type AdminChannel = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: ChannelType;
  archivedAt: Date | null;
  createdAt: Date;
  postCount: number;
};

// Revalida las superficies donde aparece un canal: panel, feed y su vista.
function revalidateChannelSurfaces(slug?: string): void {
  revalidatePath(ADMIN_PATH);
  revalidatePath(FEED_PATH);
  if (slug) revalidatePath(`/channels/${slug}`);
}

/**
 * Lista TODOS los canales (incluidos los archivados), con conteo de posts.
 * Solo ADMIN: el panel necesita ver también los archivados para desarchivarlos.
 * (La nav normal usa `getChannels` de `posts.ts`, que excluye archivados.)
 */
export async function listAllChannels(): Promise<ActionResult<AdminChannel[]>> {
  const gate = await requireAdmin();
  if (!("id" in gate)) return gate;

  try {
    const channels = await prisma.channel.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        archivedAt: true,
        createdAt: true,
        _count: { select: { posts: true } },
      },
      orderBy: [{ archivedAt: "asc" }, { type: "asc" }, { name: "asc" }],
    });

    return {
      ok: true,
      data: channels.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        type: c.type,
        archivedAt: c.archivedAt,
        createdAt: c.createdAt,
        postCount: c._count.posts,
      })),
    };
  } catch {
    return { ok: false, error: { message: "No se pudo listar los canales." } };
  }
}

/** Crea un canal. Solo ADMIN. Valida slug único + formato. */
export async function createChannel(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const gate = await requireAdmin();
  if (!("id" in gate)) return gate;

  const parsed = createChannelSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }
  const { name, slug, description, type } = parsed.data;

  try {
    // Unicidad de slug comprobada explícitamente para devolver un fieldError
    // claro (además del @unique de la BD que actúa como red de seguridad).
    const existing = await prisma.channel.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existing) {
      return {
        ok: false,
        error: {
          message: "Ya existe un canal con ese slug.",
          fieldErrors: { slug: ["Slug en uso."] },
        },
      };
    }

    const channel = await prisma.channel.create({
      data: {
        name,
        slug,
        description: description && description.length > 0 ? description : null,
        type,
      },
      select: { id: true, slug: true },
    });

    revalidateChannelSurfaces(channel.slug);
    return { ok: true, data: channel };
  } catch {
    return { ok: false, error: { message: "No se pudo crear el canal." } };
  }
}

/**
 * Edita un canal (name/description/type). El `slug` NO es editable (clave
 * estable de rutas/enlaces). Solo ADMIN.
 */
export async function updateChannel(
  id: string,
  input: { name?: string; description?: string | null; type?: ChannelType },
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (!("id" in gate)) return gate;

  const parsed = updateChannelSchema.safeParse({ id, ...input });
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  // Construimos el `data` solo con los campos presentes (update parcial).
  const data: {
    name?: string;
    description?: string | null;
    type?: ChannelType;
  } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.type !== undefined) data.type = parsed.data.type;
  if (parsed.data.description !== undefined) {
    data.description =
      parsed.data.description && parsed.data.description.length > 0
        ? parsed.data.description
        : null;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: { message: "No hay cambios que aplicar." } };
  }

  try {
    const existing = await prisma.channel.findUnique({
      where: { id: parsed.data.id },
      select: { slug: true },
    });
    if (!existing) {
      return { ok: false, error: { message: "Canal no encontrado." } };
    }

    await prisma.channel.update({ where: { id: parsed.data.id }, data });

    revalidateChannelSurfaces(existing.slug);
    return { ok: true, data: { id: parsed.data.id } };
  } catch {
    return { ok: false, error: { message: "No se pudo editar el canal." } };
  }
}

/**
 * Archiva un canal (archivado lógico): desaparece de la nav/listados normales
 * pero conserva sus posts. Solo ADMIN. Idempotente.
 */
export async function archiveChannel(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  return setChannelArchived(id, true);
}

/** Desarchiva un canal: vuelve a aparecer en la nav. Solo ADMIN. Idempotente. */
export async function unarchiveChannel(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  return setChannelArchived(id, false);
}

async function setChannelArchived(
  id: string,
  archived: boolean,
): Promise<ActionResult<{ id: string }>> {
  const gate = await requireAdmin();
  if (!("id" in gate)) return gate;

  const parsed = channelIdSchema.safeParse({ id });
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
    const existing = await prisma.channel.findUnique({
      where: { id: parsed.data.id },
      select: { slug: true },
    });
    if (!existing) {
      return { ok: false, error: { message: "Canal no encontrado." } };
    }

    await prisma.channel.update({
      where: { id: parsed.data.id },
      data: { archivedAt: archived ? new Date() : null },
    });

    revalidateChannelSurfaces(existing.slug);
    return { ok: true, data: { id: parsed.data.id } };
  } catch {
    return {
      ok: false,
      error: {
        message: archived
          ? "No se pudo archivar el canal."
          : "No se pudo desarchivar el canal.",
      },
    };
  }
}
