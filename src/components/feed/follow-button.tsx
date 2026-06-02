"use client";

// Botón Seguir / Dejar de seguir con UI optimista (Fase 5b).
//
// Mismo patrón que ReactionBar: useOptimistic + useTransition. El estado
// inicial llega de `getFollowState` (server). Al hacer clic, label y contador
// de seguidores cambian al instante; el resultado de followUser/unfollowUser
// reconcilia, y si falla revertimos + avisamos por aria-live.
//
// Si el viewer es el propio autor (isSelf), no se renderiza el botón.

import { motion } from "motion/react";
import { useOptimistic, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { followUser, unfollowUser } from "@/server/follow-actions";

type FollowSnapshot = {
  isFollowing: boolean;
  followerCount: number;
};

type Props = {
  targetUserId: string;
  targetName: string;
  isSelf: boolean;
  isFollowing: boolean;
  followerCount: number;
  /** Mostrar el conteo de seguidores junto al botón. */
  showCount?: boolean;
};

export function FollowButton({
  targetUserId,
  targetName,
  isSelf,
  isFollowing,
  followerCount,
  showCount = true,
}: Props) {
  const [confirmed, setConfirmed] = useState<FollowSnapshot>({
    isFollowing,
    followerCount,
  });
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Toggle optimista: invierte isFollowing y ajusta el contador en ±1.
  const [optimistic, setOptimistic] = useOptimistic(
    confirmed,
    (state: FollowSnapshot) => ({
      isFollowing: !state.isFollowing,
      followerCount: Math.max(
        0,
        state.followerCount + (state.isFollowing ? -1 : 1),
      ),
    }),
  );

  if (isSelf) return null;

  function onClick() {
    setError(null);
    const wasFollowing = optimistic.isFollowing;
    startTransition(async () => {
      setOptimistic(undefined);
      const res = wasFollowing
        ? await unfollowUser(targetUserId)
        : await followUser(targetUserId);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setConfirmed({
        isFollowing: res.data.isFollowing,
        followerCount: res.data.followerCount,
      });
    });
  }

  const following = optimistic.isFollowing;

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label={
          following
            ? `Dejar de seguir a ${targetName}`
            : `Seguir a ${targetName}`
        }
        aria-pressed={following}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
          following
            ? "border-border bg-surface text-muted-foreground hover:border-danger/50 hover:text-danger"
            : "border-brand bg-brand text-brand-foreground hover:opacity-90",
        )}
        onClick={onClick}
        type="button"
      >
        <motion.span
          animate={{ scale: [1, 0.9, 1] }}
          aria-hidden="true"
          className="leading-none"
          key={following ? "on" : "off"}
          transition={{ duration: 0.2 }}
        >
          {following ? "Siguiendo" : "Seguir"}
        </motion.span>
      </button>

      {showCount ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          {optimistic.followerCount}{" "}
          {optimistic.followerCount === 1 ? "seguidor" : "seguidores"}
        </span>
      ) : null}

      <span aria-live="polite" className="sr-only">
        {error
          ? error
          : following
            ? `Siguiendo a ${targetName}`
            : `Ya no sigues a ${targetName}`}
      </span>
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
