"use client";

// Composer de mensajes: textarea auto-crecible + botón enviar.
// Enter envía; Shift+Enter inserta salto de línea. Llama `onTyping` (con su
// throttle gestionado por el padre) en cada cambio. El envío lo gestiona el
// padre (optimista); aquí solo limpiamos y devolvemos el foco.

import { useCallback, useRef, useState } from "react";
import { EmojiPicker } from "@/components/emoji/emoji-picker";
import { SendIcon } from "@/components/feed/icons";
import {
  AttachButton,
  AttachmentPreviews,
} from "@/components/media/attachment-picker";
import { useUploads } from "@/hooks/use-uploads";
import { insertAtCursor, restoreCaret } from "@/lib/insert-at-cursor";
import type { UploadedFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";

type Props = {
  /** Envía el mensaje. Los adjuntos ya vienen subidos y listos para enlazar. */
  onSend: (
    content: string,
    attachments: UploadedFile[],
  ) => void | Promise<void>;
  onTyping: () => void;
};

const MAX_LEN = 4000;

export function Composer({ onSend, onTyping }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const uploads = useUploads();

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const submit = useCallback(async () => {
    const trimmed = value.trim();
    // Permite mensaje solo-imagen: basta con texto O al menos un adjunto.
    if (!trimmed && !uploads.hasItems) return;
    if (uploads.isUploading) return;

    // Sube los adjuntos primero; si falla alguno, no enviamos.
    let attachments: UploadedFile[] = [];
    if (uploads.hasItems) {
      const result = await uploads.uploadAll();
      if (result === null) return;
      attachments = result;
    }

    void onSend(trimmed, attachments);
    setValue("");
    uploads.clear();
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.focus();
      }
    });
  }, [value, onSend, uploads]);

  const insertEmoji = useCallback(
    (emoji: string) => {
      const el = textareaRef.current;
      const { value: next, caret } = insertAtCursor(el, value, emoji);
      setValue(next);
      // Reajusta la altura auto-crecible al nuevo contenido y recoloca cursor.
      requestAnimationFrame(() => {
        autoGrow();
        restoreCaret(el, caret);
      });
    },
    [value, autoGrow],
  );

  const canSend =
    !uploads.isUploading &&
    value.length <= MAX_LEN &&
    (value.trim().length > 0 || uploads.hasItems);

  return (
    <form
      className="flex flex-col gap-2 border-t border-border bg-surface px-3 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <AttachmentPreviews uploads={uploads} />
      <div className="flex items-end gap-2">
        <AttachButton buttonVariant="icon" uploads={uploads} />
        <EmojiPicker onSelect={insertEmoji} variant="icon" />
        <label className="sr-only" htmlFor="chat-composer">
          Escribe un mensaje
        </label>
        <textarea
          className="max-h-40 min-h-[2.5rem] flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
          id="chat-composer"
          maxLength={MAX_LEN}
          onChange={(e) => {
            setValue(e.target.value);
            autoGrow();
            if (e.target.value.length > 0) onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Escribe un mensaje…"
          ref={textareaRef}
          rows={1}
          value={value}
        />
        <button
          aria-label="Enviar mensaje"
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full transition",
            canSend
              ? "bg-brand text-brand-foreground hover:opacity-90"
              : "cursor-not-allowed bg-surface-muted text-muted-foreground",
          )}
          disabled={!canSend}
          type="submit"
        >
          <SendIcon className="size-4" />
        </button>
      </div>
    </form>
  );
}
