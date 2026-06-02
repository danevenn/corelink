// Datos del usuario ACTUAL para la cabecera de la UI (server-only).
// Complementa la sesión de Better Auth con su Profile (displayName/avatar),
// sin duplicar la lógica de lectura del feed de `posts.ts`.

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type Viewer = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  isAnonymous: boolean;
};

/** Devuelve el usuario actual listo para pintar, o null si no hay sesión. */
export async function getViewer(): Promise<Viewer | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { user } = session;
  // R1: el plugin `anonymous` se eliminó y `isAnonymous` ya no está en el tipo
  // de la sesión (la columna persiste en BD para datos antiguos). Lectura
  // defensiva; las sesiones nuevas son siempre no-anónimas.
  const isAnonymous =
    (user as { isAnonymous?: boolean | null }).isAnonymous ?? false;

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { displayName: true, avatarUrl: true },
  });

  const displayName =
    profile?.displayName ?? (isAnonymous ? "Invitado" : user.name) ?? "Usuario";

  return {
    id: user.id,
    email: isAnonymous ? null : user.email,
    displayName,
    avatarUrl: profile?.avatarUrl ?? null,
    isAnonymous,
  };
}
