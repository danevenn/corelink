// Tarjeta de autor reutilizable con botón de seguir (Fase 5b).
// Server Component presentacional: recibe el estado de follow ya resuelto
// (getFollowState) y delega la interacción en el island FollowButton.
// Si el autor es el propio viewer (isSelf), FollowButton se oculta solo, y la
// tarjeta sigue mostrando el resumen de seguidores.

import type { FeedAuthor, FollowState } from "@/server/posts";
import { Avatar } from "./avatar";
import { FollowButton } from "./follow-button";

type Props = {
  author: FeedAuthor;
  followState: FollowState;
};

export function AuthorFollowCard({ author, followState }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
      <Avatar
        name={author.displayName}
        seed={author.id}
        size="md"
        src={author.avatarUrl}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-foreground">
          {author.displayName}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {author.jobTitle ? `${author.jobTitle} · ` : ""}
          {followState.followerCount}{" "}
          {followState.followerCount === 1 ? "seguidor" : "seguidores"}
        </span>
      </div>
      <FollowButton
        followerCount={followState.followerCount}
        isFollowing={followState.isFollowing}
        isSelf={followState.isSelf}
        showCount={false}
        targetName={author.displayName}
        targetUserId={author.id}
      />
    </div>
  );
}
