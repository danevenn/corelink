"use client";

// Botón de BORRADO POR MODERACIÓN (Fase 10b) — visible para STAFF en posts
// AJENOS (el autor usa PostActionsMenu). Llama a `deletePost`, que en servidor
// re-verifica que el viewer sea autor o staff. Confirmación obligatoria y aviso
// visual explícito de que se borra como moderador contenido de otra persona.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deletePost } from "@/server/post-actions";
import { TrashIcon } from "./icons";

type Props = {
  postId: string;
  authorName: string;
};

export function ModerateDeleteButton({ postId, authorName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deletePost(postId);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        aria-label={`Borrar como moderación el post de ${authorName}`}
        className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        type="button"
      >
        <TrashIcon className="size-3.5" />
        <span className="hidden sm:inline">Moderar</span>
      </button>

      <ConfirmDialog
        confirmLabel="Sí, borrar contenido"
        description={
          <>
            Vas a borrar como <strong>moderación</strong> contenido de{" "}
            <strong>{authorName}</strong>. Esta acción no se puede deshacer y
            arrastra sus respuestas.
          </>
        }
        destructive
        error={error}
        onCancel={() => setOpen(false)}
        onConfirm={confirmDelete}
        open={open}
        pending={pending}
        title="Borrar contenido (moderación)"
      />
    </>
  );
}
