"use client";

// Barra de reacciones INTERACTIVA con actualización optimista (Fase 5b).
//
// Patrón elegido: React 19 `useOptimistic` + `useTransition`, coherente con el
// resto del proyecto (que consume Server Actions con useTransition, sin
// react-query). No requiere QueryClientProvider y mantiene la fuente de verdad
// en el servidor: el resultado de `toggleReaction` reconcilia el estado real y,
// si falla, revertimos + avisamos por una región aria-live.
//
// Soporta VARIOS tipos por usuario (viewerReaction es ReactionType[]).

import { AnimatePresence, motion } from "motion/react";
import { useOptimistic, useState, useTransition } from "react";
import type { ReactionType } from "@/generated/prisma/enums";
import { REACTION_META, REACTION_ORDER } from "@/lib/feed-ui";
import { cn } from "@/lib/utils";
import type { ReactionBreakdown } from "@/server/posts";
import { toggleReaction } from "@/server/reaction-actions";

type ReactionState = {
  byType: ReactionBreakdown;
  total: number;
  /** Tipos con los que el viewer ha reaccionado. */
  viewer: ReactionType[];
};

type Props = {
  postId: string;
  breakdown: ReactionBreakdown;
  total: number;
  viewerReaction: ReactionType[];
};

// Aplica el toggle de un tipo sobre un estado dado (optimista o real).
function applyToggle(state: ReactionState, type: ReactionType): ReactionState {
  const has = state.viewer.includes(type);
  const delta = has ? -1 : 1;
  return {
    byType: {
      ...state.byType,
      [type]: Math.max(0, state.byType[type] + delta),
    },
    total: Math.max(0, state.total + delta),
    viewer: has
      ? state.viewer.filter((t) => t !== type)
      : [...state.viewer, type],
  };
}

export function ReactionBar({
  postId,
  breakdown,
  total,
  viewerReaction,
}: Props) {
  // Estado confirmado por el servidor (fuente de verdad tras cada respuesta).
  const [confirmed, setConfirmed] = useState<ReactionState>({
    byType: breakdown,
    total,
    viewer: viewerReaction,
  });
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Capa optimista sobre el estado confirmado.
  const [optimistic, addOptimistic] = useOptimistic(
    confirmed,
    (state: ReactionState, type: ReactionType) => applyToggle(state, type),
  );

  function onToggle(type: ReactionType) {
    setError(null);
    startTransition(async () => {
      // 1) Aplicar al instante sobre la capa optimista.
      addOptimistic(type);
      // 2) Confirmar/reconciliar con el servidor.
      const res = await toggleReaction({ postId, type });
      if (!res.ok) {
        // El estado optimista se descarta automáticamente al cerrar la
        // transición; confirmed no cambia, así que la UI revierte sola.
        setError(res.error.message);
        return;
      }
      setConfirmed({
        byType: res.data.reactionsByType,
        total: res.data.reactionsTotal,
        viewer: res.data.viewerReaction,
      });
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTION_ORDER.map((type) => {
          const meta = REACTION_META[type];
          const count = optimistic.byType[type];
          const active = optimistic.viewer.includes(type);
          return (
            <button
              aria-label={`Reaccionar con ${meta.label}${
                count > 0 ? ` (${count})` : ""
              }`}
              aria-pressed={active}
              className={cn(
                "group inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                "hover:border-brand/60 hover:bg-brand-soft",
                active
                  ? "border-brand/50 bg-brand-soft text-brand"
                  : "border-border bg-surface text-muted-foreground",
              )}
              key={type}
              onClick={() => onToggle(type)}
              type="button"
            >
              <motion.span
                aria-hidden="true"
                className="text-sm leading-none"
                // Pop sutil al cambiar de estado (respeta reduce-motion vía
                // MotionConfig del provider que envuelve el feed).
                animate={active ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                {meta.emoji}
              </motion.span>
              <AnimatePresence initial={false} mode="popLayout">
                {count > 0 ? (
                  <motion.span
                    animate={{ opacity: 1, y: 0 }}
                    className="tabular-nums"
                    exit={{ opacity: 0, y: -4 }}
                    initial={{ opacity: 0, y: 4 }}
                    key={count}
                    transition={{ duration: 0.18 }}
                  >
                    {count}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </button>
          );
        })}

        <span className="ml-1 text-xs text-muted-foreground tabular-nums">
          {optimistic.total === 0
            ? "Sé el primero"
            : `${optimistic.total} ${
                optimistic.total === 1 ? "reacción" : "reacciones"
              }`}
        </span>
      </div>

      {/* Anuncio accesible del total y de errores. */}
      <span aria-live="polite" className="sr-only">
        {error
          ? error
          : `${optimistic.total} ${
              optimistic.total === 1 ? "reacción" : "reacciones"
            } en total`}
      </span>
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
