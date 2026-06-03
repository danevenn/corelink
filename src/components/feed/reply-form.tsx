"use client";

// Formulario de respuesta dentro de un hilo. Delega en replyToPost.
// Valida en cliente con el esquema de respuesta (espejo de post.ts).

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { EmojiPicker } from "@/components/emoji/emoji-picker";
import {
  AttachButton,
  AttachmentPreviews,
} from "@/components/media/attachment-picker";
import { MentionAutocomplete } from "@/components/mention/mention-autocomplete";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMentionAutocomplete } from "@/hooks/use-mention-autocomplete";
import { useUploads } from "@/hooks/use-uploads";
import { insertAtCursor, restoreCaret } from "@/lib/insert-at-cursor";
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

  function insertEmoji(emoji: string) {
    const { value, caret } = insertAtCursor(ref.current, content, emoji);
    setContent(value);
    restoreCaret(ref.current, caret);
  }

  // Autocompletado de @menciones en respuestas (sin conversationId).
  const mentions = useMentionAutocomplete({
    textareaRef: ref,
    value: content,
    setValue: (next, caret) => {
      setContent(next);
      restoreCaret(ref.current, caret);
    },
  });

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
      className="flex gap-3 rounded-3xl border border-border bg-surface p-4 shadow-soft"
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
        <div className="relative">
          <Textarea
            className="min-h-16 resize-y rounded-2xl leading-relaxed"
            disabled={pending}
            id={fieldId}
            onBlur={mentions.close}
            onChange={(e) => {
              setContent(e.target.value);
              mentions.onValueChange(
                e.target.value,
                e.target.selectionStart ?? e.target.value.length,
              );
            }}
            onKeyDown={mentions.onKeyDown}
            placeholder="Escribe una respuesta…"
            ref={ref}
            value={content}
          />
          <MentionAutocomplete ac={mentions} />
        </div>
        <AttachmentPreviews uploads={uploads} />
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AttachButton disabled={pending} uploads={uploads} />
            <EmojiPicker disabled={pending} onSelect={insertEmoji} />
          </div>
          <div className="flex items-center gap-3">
            <span
              aria-live="polite"
              className={
                tooLong
                  ? "text-xs tabular-nums text-danger"
                  : "text-xs tabular-nums text-muted-foreground"
              }
            >
              {remaining}
            </span>
            <Button disabled={!canSubmit} type="submit">
              <SendIcon className="size-4" />
              {uploads.isUploading
                ? "Subiendo…"
                : pending
                  ? "Enviando…"
                  : "Responder"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
