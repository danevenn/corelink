"use client";

// Visor ampliado (lightbox) accesible — compartido por posts y chat (Fase 9b).
//
// a11y: role="dialog" + aria-modal, foco atrapado dentro del diálogo, Escape
// cierra y al cerrar se devuelve el foco al elemento que lo abrió. Navegación
// entre varias imágenes con ←/→ y botones. Click en el fondo cierra. motion
// respeta prefers-reduced-motion vía el MotionConfig del árbol.

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
} from "@/components/feed/icons";

export type LightboxImage = {
  url: string;
  alt: string;
};

type Props = {
  images: LightboxImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

export function Lightbox({ images, index, onIndexChange, onClose }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const count = images.length;
  const current = images[index];
  const hasMany = count > 1;

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + count) % count);
  }, [index, count, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % count);
  }, [index, count, onIndexChange]);

  // Guarda el foco previo, lo mueve al diálogo y lo restaura al cerrar.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, []);

  // Bloquea el scroll del fondo mientras está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Teclado: Escape cierra, flechas navegan, Tab queda atrapado.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (hasMany && e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
        return;
      }
      if (hasMany && e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
        return;
      }
      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = dialog.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasMany, goPrev, goNext, onClose]);

  if (typeof document === "undefined" || !current) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        animate={{ opacity: 1 }}
        aria-labelledby={titleId}
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        transition={{ duration: 0.18 }}
      >
        <h2 className="sr-only" id={titleId}>
          Imagen ampliada{hasMany ? ` ${index + 1} de ${count}` : ""}
        </h2>

        <button
          aria-label="Cerrar visor"
          className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={onClose}
          type="button"
        >
          <CloseIcon className="size-5" />
        </button>

        {hasMany ? (
          <button
            aria-label="Imagen anterior"
            className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white sm:left-6"
            onClick={goPrev}
            type="button"
          >
            <ChevronLeftIcon className="size-6" />
          </button>
        ) : null}

        {/* biome-ignore lint/performance/noImgElement: visor de ruta dinámica auth-gated same-origin. */}
        <motion.img
          alt={current.alt}
          animate={{ opacity: 1, scale: 1 }}
          className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          initial={{ opacity: 0, scale: 0.97 }}
          key={current.url}
          src={current.url}
          transition={{ duration: 0.18, ease: "easeOut" }}
        />

        {hasMany ? (
          <button
            aria-label="Imagen siguiente"
            className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white sm:right-6"
            onClick={goNext}
            type="button"
          >
            <ChevronRightIcon className="size-6" />
          </button>
        ) : null}

        {hasMany ? (
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white tabular-nums">
            {index + 1} / {count}
          </span>
        ) : null}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
