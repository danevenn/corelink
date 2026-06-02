"use client";

// Campana de notificaciones con contador EN VIVO (Fase 7b).
//
// Responsabilidades:
//   - Badge de no leídas: se inicializa con `getUnreadCount()` (server, vía prop)
//     y se INCREMENTA en vivo cuando llega un evento SSE `notification`.
//   - Desplegable: lista las últimas notificaciones (re-fetch al abrir y al
//     llegar un evento si está abierto), distingue leídas/no leídas, permite
//     "marcar todas como leídas" (UI optimista: badge a 0 al instante) y marca
//     leídas las del lote al abrir.
//   - a11y: botón con aria-label que incluye el nº sin leer; Escape/clic fuera
//     cierran; aria-live anuncia nuevas; el badge lleva texto, no sólo color.
//
// Patrón de estado: coherente con el resto del proyecto (useTransition + estado
// local reconciliado por server actions, sin react-query).

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useNotificationEvents } from "@/hooks/use-event-stream";
import {
  fetchNotificationsPage,
  fetchUnreadCount,
  markNotificationsRead,
} from "@/server/notification-actions";
import type { NotificationView } from "@/server/notifications";
import { BellIcon } from "./icons";
import { NotificationItem } from "./notification-item";

type Props = {
  /** Contador inicial de no leídas (server: getUnreadCount). */
  initialUnread: number;
};

const DROPDOWN_LIMIT = 8;

export function NotificationBell({ initialUnread }: Props) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationView[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  // Dispara la animación de pulso del badge sólo cuando entra una nueva.
  const [pulse, setPulse] = useState(0);

  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchNotificationsPage({ limit: DROPDOWN_LIMIT });
      setItems(page.notifications);
      // Reconcilia el contador con el servidor (por si llegó algo mientras).
      const count = await fetchUnreadCount();
      setUnread(count);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Tiempo real: cada evento SSE incrementa el contador (sin recargar) ──────
  useNotificationEvents(
    useCallback(() => {
      setUnread((n) => n + 1);
      setPulse((p) => p + 1);
      // Si el desplegable está abierto, refresca la lista para mostrarla.
      setOpen((isOpen) => {
        if (isOpen) void refresh();
        return isOpen;
      });
    }, [refresh]),
  );

  // ── Abrir/cerrar ────────────────────────────────────────────────────────────
  const openPanel = useCallback(() => {
    setOpen(true);
    void refresh();
    // Al abrir, marca como leídas TODAS (badge a 0 optimista). El servidor es la
    // fuente de verdad; revalidamos la ruta para la página /notifications.
    setUnread(0);
    startTransition(async () => {
      await markNotificationsRead();
      router.refresh();
    });
  }, [refresh, router]);

  const toggle = useCallback(() => {
    if (open) setOpen(false);
    else openPanel();
  }, [open, openPanel]);

  // Cierra con clic fuera + Escape (foco vuelve al botón al cerrar con Escape).
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        const btn = ref.current?.querySelector("button");
        btn?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Mueve el foco al panel al abrir (navegación por teclado).
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  function handleMarkAllRead() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markNotificationsRead();
      router.refresh();
    });
  }

  function handleActivate(id: string) {
    // Marca leída la concreta y cierra el panel.
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnread((n) => Math.max(0, n - 1));
    setOpen(false);
    startTransition(async () => {
      await markNotificationsRead([id]);
      router.refresh();
    });
  }

  const label =
    unread > 0
      ? `Notificaciones, ${unread} sin leer`
      : "Notificaciones, sin novedades";

  return (
    <div className="relative" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="relative rounded-lg p-2 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
        onClick={toggle}
        type="button"
      >
        <BellIcon className="size-5" />
        <AnimatePresence>
          {unread > 0 ? (
            <motion.span
              animate={{ scale: 1 }}
              // Pulso al llegar una nueva (key cambia con `pulse`).
              className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-brand-foreground tabular-nums"
              exit={{ scale: 0 }}
              initial={{ scale: 0.6 }}
              key={`badge-${pulse}`}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
            >
              {unread > 99 ? "99+" : unread}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </button>

      {/* Anuncio accesible de novedades. */}
      <span aria-live="polite" className="sr-only">
        {unread > 0 ? `Tienes ${unread} notificaciones sin leer` : ""}
      </span>

      {open ? (
        <div
          aria-label="Notificaciones recientes"
          className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-elevated focus:outline-none"
          ref={panelRef}
          role="menu"
          tabIndex={-1}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              Notificaciones
            </span>
            <button
              className="rounded text-xs font-medium text-brand transition hover:underline disabled:opacity-50"
              disabled={items.every((n) => n.read)}
              onClick={handleMarkAllRead}
              type="button"
            >
              Marcar todas como leídas
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Cargando…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No tienes notificaciones todavía.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id}>
                    <NotificationItem
                      compact
                      notification={n}
                      onActivate={handleActivate}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border px-4 py-2.5 text-center">
            <Link
              className="text-xs font-medium text-brand transition hover:underline"
              href="/notifications"
              onClick={() => setOpen(false)}
            >
              Ver todas
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
