"use client";

// Fila de una notificación (desplegable y página). Cliente porque enlaza con
// un onClick opcional (marcar leída al pulsar) y se usa dentro de islands.

import Link from "next/link";
import { relativeTime } from "@/lib/feed-ui";
import { notificationAction, notificationHref } from "@/lib/notification-ui";
import { cn } from "@/lib/utils";
import type { NotificationView } from "@/server/notifications";
import { Avatar } from "./avatar";

type Props = {
  notification: NotificationView;
  /** Marca leída(s) al activar el enlace (desplegable). */
  onActivate?: (id: string) => void;
  /** Estilo compacto para el desplegable; más holgado en la página. */
  compact?: boolean;
};

export function NotificationItem({
  notification,
  onActivate,
  compact = false,
}: Props) {
  const { actor, type, post, read, createdAt } = notification;

  return (
    <Link
      className={cn(
        "flex gap-3 transition hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none",
        compact ? "px-4 py-3" : "rounded-2xl border border-border px-4 py-3.5",
        read ? "bg-transparent" : "bg-brand-soft/40",
      )}
      href={notificationHref(notification)}
      onClick={() => onActivate?.(notification.id)}
    >
      {/* Indicador de no leída (no sólo color: el fondo + el punto + sr-only). */}
      <span className="relative mt-0.5 shrink-0">
        <Avatar
          name={actor.displayName}
          seed={actor.id}
          size="sm"
          src={actor.avatarUrl}
        />
        {!read ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-surface bg-brand"
          />
        ) : null}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{actor.displayName}</span>{" "}
          <span className="text-muted-foreground">
            {notificationAction(type)}
          </span>
          {!read ? <span className="sr-only"> (sin leer)</span> : null}
        </p>
        {post ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            “{post.snippet}”
          </p>
        ) : null}
        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {relativeTime(createdAt)}
        </p>
      </div>
    </Link>
  );
}
