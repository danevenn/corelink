// Tarjeta de persona para resultados de búsqueda (Fase 6c).
// Server Component presentacional. Reutiliza Avatar + FollowButton (island).
//
// Nota: aún no existe página de perfil propia; por eso la tarjeta NO enlaza a un
// perfil (evitamos rutas rotas). El email se muestra como contacto (mailto), en
// línea con cómo el resto de la app referencia a los autores. Cuando exista
// /users/[id] (o similar), basta con envolver el bloque del nombre en un Link.

import type { UserSearchResult } from "@/server/search";
import { Avatar } from "./avatar";
import { FollowButton } from "./follow-button";

type Props = {
  user: UserSearchResult;
};

export function UserResultCard({ user }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
      <Avatar
        name={user.displayName}
        seed={user.userId}
        size="md"
        src={user.avatarUrl}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-foreground">
          {user.displayName}
          {user.isSelf ? (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              (tú)
            </span>
          ) : null}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {user.jobTitle ? `${user.jobTitle} · ` : ""}
          <a className="hover:text-brand" href={`mailto:${user.email}`}>
            {user.email}
          </a>
        </span>
      </div>
      <FollowButton
        followerCount={0}
        isFollowing={user.isFollowing}
        isSelf={user.isSelf}
        showCount={false}
        targetName={user.displayName}
        targetUserId={user.userId}
      />
    </div>
  );
}
