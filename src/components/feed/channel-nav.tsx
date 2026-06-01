"use client";

// Navegación lateral de canales. Cliente solo para resaltar el canal activo
// con el slug de la URL (?channel=) y permitir cerrar el panel en móvil.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ChannelSummary } from "@/server/posts";
import { HashIcon, HomeIcon } from "./icons";

type Props = {
  channels: ChannelSummary[];
  /** Callback opcional para cerrar el drawer en móvil al navegar. */
  onNavigate?: () => void;
};

export function ChannelNav({ channels, onNavigate }: Props) {
  const pathname = usePathname();
  // Canales con página dedicada (/channels/[slug]); resaltamos por pathname.
  const activeChannel = pathname.startsWith("/channels/")
    ? decodeURIComponent(pathname.slice("/channels/".length))
    : null;
  const onFeedRoot = pathname === "/feed";

  const departments = channels.filter((c) => c.type === "DEPARTMENT");
  const topics = channels.filter((c) => c.type === "TOPIC");

  return (
    <nav className="flex flex-col gap-6" aria-label="Canales">
      <ul className="flex flex-col gap-0.5">
        <li>
          <Link
            aria-current={onFeedRoot ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
              onFeedRoot
                ? "bg-brand-soft text-brand"
                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
            )}
            href="/feed"
            onClick={onNavigate}
          >
            <HomeIcon className="size-4" />
            Todo el feed
          </Link>
        </li>
      </ul>

      <ChannelGroup
        activeChannel={activeChannel}
        channels={departments}
        onNavigate={onNavigate}
        title="Departamentos"
      />
      <ChannelGroup
        activeChannel={activeChannel}
        channels={topics}
        onNavigate={onNavigate}
        title="Temas"
      />
    </nav>
  );
}

function ChannelGroup({
  activeChannel,
  channels,
  onNavigate,
  title,
}: {
  activeChannel: string | null;
  channels: ChannelSummary[];
  onNavigate?: () => void;
  title: string;
}) {
  if (channels.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <h2 className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <ul className="flex flex-col gap-0.5">
        {channels.map((channel) => {
          const active = activeChannel === channel.slug;
          return (
            <li key={channel.id}>
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-brand-soft font-medium text-brand"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
                href={`/channels/${channel.slug}`}
                onClick={onNavigate}
                title={channel.description ?? channel.name}
              >
                <HashIcon className="size-4 shrink-0 opacity-70" />
                <span className="truncate">{channel.name}</span>
                <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground/70">
                  {channel.postCount}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
