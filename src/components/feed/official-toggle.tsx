"use client";

// Control de STAFF para marcar/desmarcar un post como "Procedimiento oficial".
//
// Solo se monta cuando el servidor decide que el viewer es staff (canModerate),
// y la Server Action `setPostOfficial` REVALIDA el rol de todas formas: este
// componente no es la frontera de seguridad, solo la UI.
//
// Patrón del proyecto: `useOptimistic` + `useTransition` (no react-query).
// El badge cambia al instante; si la action falla, se revierte y se anuncia el
// error vía aria-live. Animación sutil con motion (respeta reduce-motion vía el
// MotionProvider que envuelve la lista).

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setPostOfficial } from "@/server/official-actions";
import { OfficialIcon } from "./icons";

type Props = {
  postId: string;
  isOfficial: boolean;
};

export function OfficialToggle({ postId, isOfficial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Estado optimista: refleja el cambio antes de que el servidor confirme.
  const [optimisticOfficial, setOptimisticOfficial] = useOptimistic(isOfficial);

  function toggle() {
    const next = !optimisticOfficial;
    setError(null);
    startTransition(async () => {
      setOptimisticOfficial(next);
      const res = await setPostOfficial(postId, next);
      if (!res.ok) {
        // El optimista se descarta solo al terminar la transición; mostramos
        // el motivo y refrescamos para volver al estado real del servidor.
        setError(res.error.message);
        router.refresh();
        return;
      }
      // Refresca el árbol para que las vistas filtradas (oficiales) se
      // actualicen de forma coherente con la BD.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {optimisticOfficial ? (
          <motion.span
            key="official-badge"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-official-soft px-2.5 py-1 text-xs font-semibold text-official"
          >
            <OfficialIcon className="size-3.5" />
            <span className="hidden sm:inline">Procedimiento oficial</span>
            <span className="sm:hidden">Oficial</span>
          </motion.span>
        ) : null}

        <button
          aria-pressed={optimisticOfficial}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50",
            optimisticOfficial
              ? "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              : "text-official hover:bg-official-soft",
          )}
          disabled={pending}
          onClick={toggle}
          type="button"
        >
          <OfficialIcon className="size-3.5" />
          {optimisticOfficial ? "Quitar oficial" : "Marcar oficial"}
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {pending
          ? "Actualizando estado oficial…"
          : optimisticOfficial
            ? "Marcado como procedimiento oficial."
            : "No es procedimiento oficial."}
      </p>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
