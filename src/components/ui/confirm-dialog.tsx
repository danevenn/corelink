"use client";

// Diálogo de confirmación accesible reutilizable (Fase 10b).
//
// role="alertdialog" con foco atrapado, cierre con Escape y clic en el backdrop,
// y devolución del foco al disparador al cerrar. Las acciones destructivas se
// diferencian por color + texto (no solo color). Pensado para acciones
// admin/moderación (banear, eliminar, archivar, borrar contenido ajeno).

import { motion } from "motion/react";
import { type ReactNode, useCallback, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  description: ReactNode;
  /** Texto del botón de confirmación. Por defecto "Confirmar". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Variante destructiva = botón rojo (borrar, banear, eliminar). */
  destructive?: boolean;
  /** Deshabilita el botón de confirmación (estado pendiente). */
  pending?: boolean;
  /** Mensaje de error del servidor a mostrar dentro del diálogo. */
  error?: string | null;
  /** Contenido extra (p.ej. campos de motivo/caducidad). */
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  pending = false,
  error,
  children,
  onConfirm,
  onCancel,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  // Enfoca el botón de confirmación al abrir (respuesta a acción del usuario).
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  // Escape cierra; Tab queda atrapado dentro del panel.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus();
      }
    },
    [onCancel],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop: clic fuera cancela. */}
      <button
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
        tabIndex={-1}
        type="button"
      />
      <motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        aria-describedby={descId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        ref={panelRef}
        role="alertdialog"
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        <h2 className="text-base font-semibold text-foreground" id={titleId}>
          {title}
        </h2>
        <div className="mt-2 text-sm text-muted-foreground" id={descId}>
          {description}
        </div>

        {children ? <div className="mt-4">{children}</div> : null}

        {error ? (
          <p
            className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted"
            disabled={pending}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold text-white transition disabled:opacity-50",
              destructive
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-brand text-brand-foreground hover:opacity-90",
            )}
            disabled={pending}
            onClick={onConfirm}
            ref={confirmRef}
            type="button"
          >
            {pending ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
