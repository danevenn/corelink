"use client";

// Formulario de respuesta dentro de un hilo. Delega en replyToPost.
// Valida en cliente con el esquema de respuesta (espejo de post.ts).

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import {
  AttachButton,
  AttachmentPreviews,
} from "@/components/media/attachment-picker";
import { useUploads } from "@/hooks/use-uploads";
import { replyToPostSchema } from "@/lib/validations/post";
import { createPost } from "@/server/post-actions";
import { Avatar } from "./avatar";
import { SendIcon } from "./icons";

type Props = {
  parentId: string;
  viewer: { id: string; displayName: string; avatarUrl: string | null };
};

const MAX = 5000;

export function ReplyForm({ parentId, viewer }: Props) {
  const router = useRouter();
  const fieldId = useId();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);
  const uploads = useUploads();

  const remaining = MAX - content.length;
  const tooLong = remaining < 0;
  const hasText = content.trim().length > 0;
  // Permite responder SOLO con imagen si hay al menos un adjunto.
  const canSubmit =
    !pending &&
    !uploads.isUploading &&
    !tooLong &&
    (hasText || uploads.hasItems);

  function submit() {
    setError(null);

    startTransition(async () => {
      let attachments: Awaited<ReturnType<typeof uploads.uploadAll>> = [];
      if (uploads.hasItems) {
        attachments = await uploads.uploadAll();
        if (attachments === null) {
          setError(
            "Algún archivo no se pudo subir. Revísalo e inténtalo otra vez.",
          );
          return;
        }
      }

      const parsed = replyToPostSchema.safeParse({
        parentId,
        content,
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Revisa tu respuesta.");
        return;
      }
      // `createPost` acepta la forma { parentId, content, attachments }
      // (replyToPost no propaga adjuntos; aquí los necesitamos).
      const res = await createPost(parsed.data);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setContent("");
      uploads.clear();
      ref.current?.focus();
      router.refresh();
    });
  }

  return (
    <form
      aria-label="Responder al hilo"
      className="flex gap-3 rounded-2xl border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Avatar
        name={viewer.displayName}
        seed={viewer.id}
        size="sm"
        src={viewer.avatarUrl}
      />
      <div className="flex flex-1 flex-col gap-2">
        <label className="sr-only" htmlFor={fieldId}>
          Escribe una respuesta
        </label>
        <textarea
          className="min-h-16 w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand"
          disabled={pending}
          id={fieldId}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe una respuesta…"
          ref={ref}
          value={content}
        />
        <AttachmentPreviews uploads={uploads} />
        {error ? (
          <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <AttachButton disabled={pending} uploads={uploads} />
          <div className="flex items-center gap-3">
            <span
              className={
                tooLong
                  ? "text-xs tabular-nums text-rose-600 dark:text-rose-400"
                  : "text-xs tabular-nums text-muted-foreground"
              }
            >
              {remaining}
            </span>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
              disabled={!canSubmit}
              type="submit"
            >
              <SendIcon className="size-4" />
              {uploads.isUploading
                ? "Subiendo…"
                : pending
                  ? "Enviando…"
                  : "Responder"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
