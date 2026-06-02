"use client";

// Subnavegación del panel (Usuarios / Canales / Moderación).
// Cliente solo para resaltar la sub-ruta activa por pathname.
//
// R2: migrada al sistema de diseño — pestañas en "píldora" coherentes con
// `FeedTabs` (borde + fondo `surface-muted`, activa elevada sobre `surface`).
//
// Ajuste R-staff: ROLE-AWARE. La pestaña "Canales" es solo-admin; un moderador
// solo ve "Usuarios" y "Moderación". (El backend de canales ya es admin-only y
// la ruta `/admin/channels` se re-protege en servidor.)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/users", label: "Usuarios", adminOnly: false },
  { href: "/admin/channels", label: "Canales", adminOnly: true },
  { href: "/admin/moderation", label: "Moderación", adminOnly: false },
] as const;

export function AdminTabs({ viewerIsAdmin }: { viewerIsAdmin: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter((tab) => viewerIsAdmin || !tab.adminOnly);

  return (
    <nav
      aria-label="Secciones de gestión"
      className="flex w-fit items-center gap-1 overflow-x-auto rounded-full border border-border bg-surface-muted p-1"
    >
      {tabs.map((tab) => {
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
