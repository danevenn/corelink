"use client";

// Compositor de posts raíz: textarea + selector de canal opcional.
// Valida en cliente espejando post.ts (zod) y delega en la Server Action
// createPost. Estado pendiente con useTransition (React 19).

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { EmojiPicker } from "@/components/emoji/emoji-picker";
import {
  AttachButton,
  AttachmentPreviews,
} from "@/components/media/attachment-picker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUploads } from "@/hooks/use-uploads";
import { insertAtCursor, restoreCaret } from "@/lib/insert-at-cursor";
import { createPostSchema } from "@/lib/validations/post";
import { createPost } from "@/server/post-actions";
import type { ChannelSummary } from "@/server/posts";
import { Avatar } from "./avatar";
import { SendIcon } from "./icons";

type Props = {
  channels: ChannelSummary[];
  viewer: { id: string; displayName: string; avatarUrl: string | null };
  /** Canal preseleccionado cuando el feed está filtrado por canal. */
  defaultChannelId?: string;
};

const MAX = 5000;

export function PostComposer({ channels, viewer, defaultChannelId }: Props) {
  const router = useRouter();
  const textareaId = useId();
  const channelId = useId();
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState(defaultChannelId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const uploads = useUploads();

  const remaining = MAX - content.length;
  const tooLong = remaining < 0;
  const hasText = content.trim().length > 0;
  // Permite publicar SOLO imagen (sin texto) si hay al menos un adjunto.
  const canSubmit =
    !pending &&
    !uploads.isUploading &&
    !tooLong &&
    (hasText || uploads.hasItems);

  function insertEmoji(emoji: string) {
    const { value, caret } = insertAtCursor(
      textareaRef.current,
      content,
      emoji,
    );
    setContent(value);
    restoreCaret(textareaRef.current, caret);
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      // 1) Sube primero los adjuntos en cola (si los hay).
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

      const parsed = createPostSchema.safeParse({
        content,
        ...(channel ? { channelId: channel } : {}),
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      });
      if (!parsed.success) {
        setError(
          parsed.error.issues[0]?.message ?? "Revisa el contenido del post.",
        );
        return;
      }

      const res = await createPost(parsed.data);
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setContent("");
      setChannel(defaultChannelId ?? "");
      uploads.clear();
      textareaRef.current?.focus();
      router.refresh();
    });
  }

  return (
    <form
      aria-label="Crear publicación"
      className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-4 shadow-soft sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex gap-3">
        <Avatar
          name={viewer.displayName}
          seed={viewer.id}
          size="md"
          src={viewer.avatarUrl}
        />
        <div className="flex-1">
          <label className="sr-only" htmlFor={textareaId}>
            Comparte algo con tu equipo
          </label>
          <Textarea
            className="min-h-20 resize-y rounded-2xl leading-relaxed"
            disabled={pending}
            id={textareaId}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Comparte una actualización, una pregunta o un procedimiento…"
            ref={textareaRef}
            value={content}
          />
        </div>
      </div>

      <AttachmentPreviews uploads={uploads} />

      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AttachButton disabled={pending} uploads={uploads} />
          <EmojiPicker disabled={pending} onSelect={insertEmoji} />
          <label className="sr-only" htmlFor={channelId}>
            Canal
          </label>
          <select
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none transition focus:border-brand"
            disabled={pending}
            id={channelId}
            onChange={(e) => setChannel(e.target.value)}
            value={channel}
          >
            <option value="">Sin canal</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                # {c.name}
              </option>
            ))}
          </select>
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
                ? "Publicando…"
                : "Publicar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
