"use client";

// Controles de autor: editar (inline) y borrar (con confirmación).
// Llaman a las Server Actions editPost/deletePost vía useTransition.

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
        <Textarea
          className="min-h-24 resize-y rounded-2xl leading-relaxed"
          disabled={pending}
          id={fieldId}
          onChange={(e) => setContent(e.target.value)}
          ref={editRef}
          value={content}
        />
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            disabled={pending}
            onClick={submitEdit}
            size="sm"
            type="button"
          >
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              setMode("idle");
              setContent(initialContent);
              setError(null);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "confirmDelete") {
    return (
      <div
        className="mt-2 flex flex-col gap-2 rounded-2xl border border-danger/40 bg-danger-soft p-3"
        role="alertdialog"
        aria-label="Confirmar borrado"
      >
        <p className="text-xs text-danger">
          ¿Seguro que quieres borrar este post? Esta acción no se puede deshacer
          y arrastra sus respuestas.
        </p>
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button
            disabled={pending}
            onClick={confirmDelete}
            size="sm"
            type="button"
            variant="destructive"
          >
            {pending ? "Borrando…" : "Sí, borrar"}
          </Button>
          <Button
            disabled={pending}
            onClick={() => setMode("idle")}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancelar
          </Button>
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
        className="hover:text-danger"
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
