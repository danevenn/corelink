"use client";

// Controles de autor: editar (inline) y borrar (con confirmación).
// Llaman a las Server Actions editPost/deletePost vía useTransition.

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { editPostSchema } from "@/lib/validations/post";
import { deletePost, editPost } from "@/server/post-actions";
import { EditIcon, TrashIcon } from "./icons";

type Props = {
  postId: string;
  initialContent: string;
};

export function PostActionsMenu({ postId, initialContent }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "editing" | "confirmDelete">(
    "idle",
  );
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fieldId = useId();
  const editRef = useRef<HTMLTextAreaElement>(null);

  // Enfoca el textarea al entrar en modo edición (en respuesta a la acción del
  // usuario, no en carga de página: evita el antipatrón de autoFocus).
  useEffect(() => {
    if (mode === "editing") {
      const el = editRef.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    }
  }, [mode]);

  function submitEdit() {
    setError(null);
    const parsed = editPostSchema.safeParse({ id: postId, content });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "El contenido no es válido.");
      return;
    }
    startTransition(async () => {
      const res = await editPost(postId, parsed.data.content);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setMode("idle");
      router.refresh();
    });
  }

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deletePost(postId);
      if (!res.ok) {
        setError(res.error.message);
        setMode("idle");
        return;
      }
      router.refresh();
    });
  }

  if (mode === "editing") {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <label className="sr-only" htmlFor={fieldId}>
          Editar contenido del post
        </label>
        <textarea
          className="min-h-24 w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm text-foreground outline-none focus:border-brand"
          disabled={pending}
          id={fieldId}
          onChange={(e) => setContent(e.target.value)}
          ref={editRef}
          value={content}
        />
        {error ? (
          <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
            disabled={pending}
            onClick={submitEdit}
            type="button"
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-surface-muted"
            disabled={pending}
            onClick={() => {
              setMode("idle");
              setContent(initialContent);
              setError(null);
            }}
            type="button"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <div
        className="mt-2 flex flex-col gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/40"
        role="alertdialog"
        aria-label="Confirmar borrado"
      >
        <p className="text-xs text-rose-700 dark:text-rose-300">
          ¿Seguro que quieres borrar este post? Esta acción no se puede deshacer
          y arrastra sus respuestas.
        </p>
        {error ? (
          <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            disabled={pending}
            onClick={confirmDelete}
            type="button"
          >
            {pending ? "Borrando…" : "Sí, borrar"}
          </button>
          <button
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-surface-muted"
            disabled={pending}
            onClick={() => setMode("idle")}
            type="button"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <ActionButton
        label="Editar post"
        onClick={() => {
          setContent(initialContent);
          setMode("editing");
        }}
      >
        <EditIcon className="size-3.5" />
        Editar
      </ActionButton>
      <ActionButton
        className="hover:text-rose-600 dark:hover:text-rose-400"
        label="Borrar post"
        onClick={() => setMode("confirmDelete")}
      >
        <TrashIcon className="size-3.5" />
        Borrar
      </ActionButton>
    </div>
  );
}

function ActionButton({
  children,
  className,
  label,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
