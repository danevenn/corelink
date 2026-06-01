// Tarjeta de persona para resultados de búsqueda (Fase 6c).
// Server Component presentacional. Reutiliza Avatar + FollowButton (island).
//
// El nombre y el avatar enlazan al perfil `/users/[id]`. El email (mailto) y el
// FollowButton son hermanos (no anidados dentro del enlace de perfil), así
// evitamos un `<a>` dentro de otro `<a>`.

import Link from "next/link";
import type { UserSearchResult } from "@/server/search";
import { Avatar } from "./avatar";
import { FollowButton } from "./follow-button";

type Props = {
  user: UserSearchResult;
};

export function UserResultCard({ user }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
      <Link
        aria-label={`Ver el perfil de ${user.displayName}`}
        className="shrink-0 rounded-full"
        href={`/users/${user.userId}`}
      >
        <Avatar
          name={user.displayName}
          seed={user.userId}
          size="md"
          src={user.avatarUrl}
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold">
          <Link
            className="rounded text-foreground transition hover:text-brand"
            href={`/users/${user.userId}`}
          >
            {user.displayName}
          </Link>
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
