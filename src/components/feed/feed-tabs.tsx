// Tabs General / Siguiendo (Fase 5b).
//
// Implementadas como enlaces (?view=...) para que funcionen sin JS y sean
// navegables/compartibles. Semántica de tablist con role="tab" +
// aria-selected; el contenido (la lista del feed) lo identifica el page con
// id="feed-panel" y role="tabpanel". Navegación por teclado nativa (Tab) y
// foco visible heredado del :focus-visible global.

import Link from "next/link";
import { cn } from "@/lib/utils";

type View = "general" | "following";

type Props = {
  active: View;
  /** Slug de canal activo, para conservarlo al cambiar de pestaña. */
  channelSlug?: string;
};

function hrefFor(view: View, channelSlug?: string): string {
  const params = new URLSearchParams();
  if (channelSlug) params.set("channel", channelSlug);
  if (view === "following") params.set("view", "following");
  const qs = params.toString();
  return qs ? `/feed?${qs}` : "/feed";
}

const TABS: { view: View; label: string }[] = [
  { view: "general", label: "General" },
  { view: "following", label: "Siguiendo" },
];

export function FeedTabs({ active, channelSlug }: Props) {
  return (
    <div
      aria-label="Vista del feed"
      className="flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1"
      role="tablist"
    >
      {TABS.map(({ view, label }) => {
        const selected = view === active;
        return (
          <Link
            aria-controls="feed-panel"
            aria-selected={selected}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              selected
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={hrefFor(view, channelSlug)}
            key={view}
            role="tab"
            // La pestaña no seleccionada no recibe foco con flechas, pero sí con
            // Tab: usamos enlaces, así el orden de tabulación es natural.
            tabIndex={selected ? 0 : -1}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
