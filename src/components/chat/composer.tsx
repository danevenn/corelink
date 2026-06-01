"use client";

// Composer de mensajes: textarea auto-crecible + botón enviar.
// Enter envía; Shift+Enter inserta salto de línea. Llama `onTyping` (con su
// throttle gestionado por el padre) en cada cambio. El envío lo gestiona el
// padre (optimista); aquí solo limpiamos y devolvemos el foco.

import { useCallback, useRef, useState } from "react";
import { SendIcon } from "@/components/feed/icons";
import { cn } from "@/lib/utils";

type Props = {
  onSend: (content: string) => void | Promise<void>;
  onTyping: () => void;
};

const MAX_LEN = 4000;

export function Composer({ onSend, onTyping }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    void onSend(trimmed);
    setValue("");
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.focus();
      }
    });
  }, [value, onSend]);

  const canSend = value.trim().length > 0 && value.length <= MAX_LEN;

  return (
    <form
      className="flex items-end gap-2 border-t border-border bg-surface px-3 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
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
            submit();
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
    </form>
  );
}
