"use client";

// Navegación lateral de /docs. Cliente por necesidad: resalta el enlace activo
// según la ruta actual (usePathname) y marca aria-current para lectores de
// pantalla. El contenido de las páginas sigue siendo Server Component.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_NAV } from "@/components/docs/docs-nav";
import { cn } from "@/lib/utils";

export function DocsSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentación" className={className}>
      <ul className="flex flex-col gap-1">
        {DOCS_NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-2xl px-4 py-3 text-sm transition focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active
                    ? "bg-brand-soft font-semibold text-brand"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
                href={item.href}
              >
                <span className="block">{item.label}</span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  {item.description}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
