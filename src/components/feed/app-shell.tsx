"use client";

// Carcasa de la zona autenticada: cabecera con marca + usuario, barra lateral
// de canales (fija en desktop, drawer deslizable en móvil) y columna central.
// Cliente por el estado del drawer y el cierre con Escape / clic fuera.

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** Navegación de canales (server-rendered, envuelta en Suspense por el padre). */
  sidebar: ReactNode;
  /** Cabecera de usuario (avatar + nombre + logout). */
  user: ReactNode;
  children: ReactNode;
};

export function AppShell({ sidebar, user, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Cierra el drawer al pulsar Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Cierra el drawer automáticamente al navegar a otro canal/ruta.
  // biome-ignore lint/correctness/useExhaustiveDependencies: cerrar al cambiar URL.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname, searchParams]);

  const close = () => setDrawerOpen(false);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
          <button
            aria-controls="channel-drawer"
            aria-expanded={drawerOpen}
            aria-label="Abrir canales"
            className="-ml-1 rounded-lg p-2 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground lg:hidden"
            onClick={() => setDrawerOpen(true)}
            type="button"
          >
            <svg
              aria-hidden="true"
              fill="none"
              height={20}
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth={2}
              viewBox="0 0 24 24"
              width={20}
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <a
            className="flex items-center gap-2 font-semibold text-foreground"
            href="/feed"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
              C
            </span>
            <span>CoreLink</span>
          </a>

          <div className="ml-auto">{user}</div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-20">{sidebar}</div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* Drawer móvil */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Cerrar canales"
            className="absolute inset-0 bg-black/40"
            onClick={close}
            type="button"
          />
          <div
            className={cn(
              "absolute inset-y-0 left-0 w-72 max-w-[80%] overflow-y-auto border-r border-border bg-surface p-4 shadow-xl",
            )}
            id="channel-drawer"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="font-semibold text-foreground">Canales</span>
              <button
                aria-label="Cerrar"
                className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-muted"
                onClick={close}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  height={18}
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  width={18}
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* El drawer se cierra solo al cambiar de URL (efecto arriba). */}
            {sidebar}
          </div>
        </div>
      ) : null}
    </div>
  );
}
