"use client";

// Burbuja de un mensaje. Alineada a la derecha (propio) o izquierda (ajeno).
// Entra con una animación sutil (motion respeta prefers-reduced-motion vía el
// MotionConfig del árbol). Muestra estado de envío/leído de los mensajes propios.

import { motion } from "motion/react";
import { CheckIcon, DoubleCheckIcon } from "@/components/feed/icons";
import { AttachmentGallery } from "@/components/media/attachment-gallery";
import { RichText } from "@/components/mention/rich-text";
import { cn } from "@/lib/utils";
import type { ChatAttachmentView } from "@/server/chat";

type Props = {
  content: string;
  attachments: ChatAttachmentView[];
  mine: boolean;
  time: string;
  senderName: string;
  /** Agrupado con el mensaje anterior del mismo autor (oculta el nombre). */
  grouped: boolean;
  status?: "sending" | "failed";
  onRetry?: () => void;
  /** ¿Mostrar confirmación de leído (solo último mensaje propio)? */
  showSeen: boolean;
  /** Nº de OTROS miembros que lo han visto. */
  seenBy: number;
  /** Nº total de otros miembros (para "Visto por todos" en grupo). */
  otherCount: number;
};

export function MessageBubble({
  content,
  attachments,
  mine,
  time,
  senderName,
  grouped,
  status,
  onRetry,
  showSeen,
  seenBy,
  otherCount,
}: Props) {
  const hasText = content.trim().length > 0;
  const hasAttachments = attachments.length > 0;
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col", mine ? "items-end" : "items-start")}
      initial={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {!mine && !grouped ? (
        <span className="mb-0.5 ml-1 text-xs font-medium text-muted-foreground">
          {senderName}
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[78%] text-sm leading-relaxed",
          // Solo imágenes (sin texto): sin fondo/padding, las imágenes mandan.
          hasText
            ? cn(
                "rounded-2xl px-3.5 py-2",
                mine
                  ? "rounded-br-md bg-brand text-brand-foreground"
                  : "rounded-bl-md bg-surface-muted text-foreground",
              )
            : "",
          status === "failed" && "opacity-70 ring-1 ring-danger/60",
        )}
      >
        {hasText ? (
          <p className="whitespace-pre-wrap break-words">
            <RichText
              mentionClassName={
                mine ? "text-brand-foreground underline" : undefined
              }
            >
              {content}
            </RichText>
          </p>
        ) : null}
        {hasAttachments ? (
          <AttachmentGallery
            attachments={attachments}
            authorName={senderName}
            variant="chat"
          />
        ) : null}
      </div>

      <div
        className={cn(
          "mt-0.5 flex items-center gap-1 px-1 text-[11px] text-muted-foreground",
          mine ? "flex-row-reverse" : "flex-row",
        )}
      >
        <time>{time}</time>
        {mine && status === "sending" ? (
          <span className="text-muted-foreground/70">Enviando…</span>
        ) : null}
        {mine && status === "failed" ? (
          <button
            className="font-medium text-danger hover:underline"
            onClick={onRetry}
            type="button"
          >
            No enviado · Reintentar
          </button>
        ) : null}
        {mine && !status && showSeen ? (
          seenBy > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-brand">
              <DoubleCheckIcon className="size-3.5" />
              {otherCount > 1
                ? seenBy >= otherCount
                  ? "Visto por todos"
                  : `Visto por ${seenBy}`
                : "Visto"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5">
              <CheckIcon className="size-3.5" />
              Enviado
            </span>
          )
        ) : null}
      </div>
    </motion.div>
  );
}
