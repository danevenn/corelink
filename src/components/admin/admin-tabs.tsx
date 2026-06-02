"use client";

// Subnavegación del panel admin (Usuarios / Canales / Moderación).
// Cliente solo para resaltar la sub-ruta activa por pathname.
//
// R2: migrada al sistema de diseño — pestañas en "píldora" coherentes con
// `FeedTabs` (borde + fondo `surface-muted`, activa elevada sobre `surface`).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/users", label: "Usuarios" },
  { href: "/admin/channels", label: "Canales" },
  { href: "/admin/moderation", label: "Moderación" },
] as const;

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de administración"
      className="flex w-fit items-center gap-1 overflow-x-auto rounded-full border border-border bg-surface-muted p-1"
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={tab.href}
            key={tab.href}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
