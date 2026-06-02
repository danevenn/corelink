"use client";

// Carcasa de la zona autenticada: cabecera con marca + usuario, barra lateral
// de canales (fija en desktop, drawer deslizable en móvil) y columna central.
// Cliente por el estado del drawer y el cierre con Escape / clic fuera.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { SearchIcon, ShieldIcon } from "./icons";
import { SearchInput } from "./search-input";

type Props = {
  /** Navegación de canales (server-rendered, envuelta en Suspense por el padre). */
  sidebar: ReactNode;
  /** Cabecera de usuario (avatar + nombre + logout). */
  user: ReactNode;
  /** Campana de notificaciones (island con contador en vivo). */
  notifications: ReactNode;
  /** Enlace a mensajes (island con badge de no-leídos en vivo). */
  messages: ReactNode;
  /**
   * ¿El viewer es admin? DECIDIDO EN SERVIDOR (`isAdmin` en el layout). Solo
   * controla la visibilidad del enlace "Admin"; el panel se re-protege en su
   * propio layout server (nunca confiamos solo en ocultar en cliente).
   */
  isAdmin?: boolean;
  children: ReactNode;
};

export function AppShell({
  sidebar,
  user,
  notifications,
  messages,
  isAdmin = false,
  children,
}: Props) {
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
      <header className="sticky top-0 z-30 border-b border-border bg-surface/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
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
            aria-label="CoreLink, ir al feed"
            className="rounded-lg focus-visible:outline-none"
            href="/feed"
          >
            <Wordmark />
          </a>

          <div className="ml-auto flex items-center gap-2">
            <SearchInput />
            {/* En móvil el input se oculta; enlace directo a la página de búsqueda. */}
            <Link
              aria-label="Buscar"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground sm:hidden"
              href="/search"
            >
              <SearchIcon className="size-5" />
            </Link>
            {isAdmin ? (
              <Link
                aria-current={
                  pathname.startsWith("/admin") ? "page" : undefined
                }
                aria-label="Panel de administración"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition",
                  pathname.startsWith("/admin")
                    ? "bg-brand-soft text-brand"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                )}
                href="/admin"
              >
                <ShieldIcon className="size-5" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            ) : null}
            {messages}
            {notifications}
            <ThemeToggle />
            {user}
          </div>
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
