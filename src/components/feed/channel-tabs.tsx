// Tabs de la página de canal: Todo / Procedimientos oficiales (Fase 6c).
//
// Mismo patrón que `feed-tabs.tsx`: enlaces (?view=official) para funcionar sin
// JS, navegables y compartibles. Semántica tablist/tab + aria-selected; el page
// marca el contenido con id="channel-panel" y role="tabpanel".

import Link from "next/link";
import { cn } from "@/lib/utils";

type View = "all" | "official";

type Props = {
  active: View;
  slug: string;
};

function hrefFor(view: View, slug: string): string {
  return view === "official"
    ? `/channels/${slug}?view=official`
    : `/channels/${slug}`;
}

const TABS: { view: View; label: string }[] = [
  { view: "all", label: "Todo" },
  { view: "official", label: "Procedimientos oficiales" },
];

export function ChannelTabs({ active, slug }: Props) {
  return (
    <div
      aria-label="Vista del canal"
      className="flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1"
      role="tablist"
    >
      {TABS.map(({ view, label }) => {
        const selected = view === active;
        return (
          <Link
            aria-controls="channel-panel"
            aria-selected={selected}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              selected
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={hrefFor(view, slug)}
            key={view}
            role="tab"
            tabIndex={selected ? 0 : -1}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
