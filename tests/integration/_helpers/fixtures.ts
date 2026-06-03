// Fixtures de integración: creación rápida de usuarios, perfiles, canales y posts
// directamente vía Prisma sobre la BD de test.
//
// Para la mayoría de tests basta con una fila `user` + `profile`: las acciones
// solo necesitan que el id exista y (para FTS / búsqueda) que haya Profile. NO
// pasamos por Better Auth aquí (el sign-up público está deshabilitado y el hash
// de credenciales es irrelevante cuando la sesión se inyecta con `runAs`). El
// flujo real de alta vía `auth.api.createUser` se prueba en el test específico de
// `createEmployee`, que sí lo ejerce de verdad.

import { randomUUID } from "node:crypto";
import { ChannelType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

type Role = "user" | "moderator" | "admin";

let counter = 0;
function uniqueSuffix(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}-${randomUUID().slice(0, 8)}`;
}

export type SeededUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
};

/** Crea un User (tabla de Better Auth) + su Profile de dominio. */
export async function createUser(opts?: {
  role?: Role;
  displayName?: string;
  jobTitle?: string;
  bio?: string;
}): Promise<SeededUser> {
  const suffix = uniqueSuffix();
  const id = `usr_${suffix}`.replace(/[^a-zA-Z0-9_-]/g, "");
  const email = `user-${suffix}@corelink.test`;
  const displayName = opts?.displayName ?? `Usuario ${suffix}`;
  const role = opts?.role ?? "user";

  await prisma.user.create({
    data: {
      id,
      name: displayName,
      email,
      emailVerified: true,
      role,
      profile: {
        create: {
          displayName,
          jobTitle: opts?.jobTitle ?? null,
          bio: opts?.bio ?? null,
        },
      },
    },
  });

  return { id, email, displayName, role };
}

/** Crea un canal (TOPIC por defecto). */
export async function createChannel(opts?: {
  slug?: string;
  name?: string;
  type?: ChannelType;
}): Promise<{ id: string; slug: string }> {
  const suffix = uniqueSuffix();
  const slug = opts?.slug ?? `canal-${suffix}`.toLowerCase();
  const channel = await prisma.channel.create({
    data: {
      slug,
      name: opts?.name ?? `Canal ${suffix}`,
      type: opts?.type ?? ChannelType.TOPIC,
    },
    select: { id: true, slug: true },
  });
  return channel;
}

/** Crea un post raíz simple de un autor dado (atajo, sin pasar por la action). */
export async function createPostRow(
  authorId: string,
  opts?: { content?: string; channelId?: string; isOfficial?: boolean },
): Promise<{ id: string }> {
  return prisma.post.create({
    data: {
      authorId,
      content: opts?.content ?? "Contenido de prueba",
      channelId: opts?.channelId ?? null,
      isOfficial: opts?.isOfficial ?? false,
    },
    select: { id: true },
  });
}
