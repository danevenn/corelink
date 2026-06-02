"use client";

// Selector + previsualización de adjuntos en compositores (Fase 9b, DRY).
//
// Compone: botón "Adjuntar" (input file accesible oculto), tira de miniaturas de
// imágenes (con botón quitar y estado de subida), chips de PDF y mensaje de
// error de validación. No habla con el servidor: opera sobre el estado del hook
// `useUploads` que le pasa el compositor. motion suaviza la entrada/salida de
// miniaturas respetando prefers-reduced-motion.

import { AnimatePresence, motion } from "motion/react";
import { useId, useRef } from "react";
import { CloseIcon, FileIcon, PaperclipIcon } from "@/components/feed/icons";
import type { UseUploadsResult } from "@/hooks/use-uploads";
import {
  MAX_ATTACHMENTS_PER_CONTENT,
  UPLOAD_ACCEPT,
} from "@/lib/upload-client";
import { cn } from "@/lib/utils";

type Props = {
  uploads: UseUploadsResult;
  disabled?: boolean;
  /** Tamaño del botón: "md" en post, "icon" compacto en chat. */
  buttonVariant?: "md" | "icon";
};

/** Botón de adjuntar aislado (para colocarlo donde encaje en cada compositor). */
export function AttachButton({
  uploads,
  disabled,
  buttonVariant = "md",
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = uploads.items.length >= MAX_ATTACHMENTS_PER_CONTENT;
  const isDisabled = disabled || atLimit;

  return (
    <>
      <input
        accept={UPLOAD_ACCEPT}
        className="sr-only"
        disabled={isDisabled}
        id={inputId}
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploads.add(e.target.files);
          }
          // Permite volver a elegir el mismo archivo tras quitarlo.
          e.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <label
        aria-disabled={isDisabled}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full text-muted-foreground transition hover:bg-surface-muted hover:text-foreground focus-within:ring-2 focus-within:ring-brand",
          buttonVariant === "icon"
            ? "size-10 justify-center"
            : "px-2.5 py-1.5 text-xs font-medium",
          isDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
        )}
        htmlFor={inputId}
        title={
          atLimit
            ? `Máximo ${MAX_ATTACHMENTS_PER_CONTENT} archivos`
            : "Adjuntar imágenes o PDF"
        }
      >
        <PaperclipIcon className="size-4" />
        {buttonVariant === "md" ? <span>Adjuntar</span> : null}
        <span className="sr-only">Adjuntar imágenes o PDF</span>
      </label>
    </>
  );
}

/** Tira de previsualización de los adjuntos en cola + error de validación. */
export function AttachmentPreviews({ uploads }: { uploads: UseUploadsResult }) {
  if (!uploads.hasItems && !uploads.addError) return null;

  return (
    <div className="flex flex-col gap-2">
      {uploads.hasItems ? (
        <ul className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {uploads.items.map((item) => (
              <motion.li
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
                exit={{ opacity: 0, scale: 0.9 }}
                initial={{ opacity: 0, scale: 0.9 }}
                key={item.id}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                {item.isImage && item.previewUrl ? (
                  <div className="relative size-20 overflow-hidden rounded-2xl border border-border bg-surface-muted">
                    {/* biome-ignore lint/performance/noImgElement: preview de object URL local. */}
                    <img
                      alt={`Previsualización de ${item.name}`}
                      className="size-full object-cover"
                      src={item.previewUrl}
                    />
                    {item.status === "uploading" ? (
                      <div className="absolute inset-0 grid place-items-center bg-black/40">
                        <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      </div>
                    ) : null}
                    {item.status === "error" ? (
                      <div className="absolute inset-0 grid place-items-center bg-danger/70 px-1 text-center text-[10px] font-medium text-white">
                        Error
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-20 w-40 flex-col justify-center gap-1 rounded-2xl border border-border bg-surface-muted px-3">
                    <div className="flex items-center gap-1.5">
                      <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-xs font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {item.status === "uploading"
                        ? "Subiendo…"
                        : item.status === "error"
                          ? "Error al subir"
                          : "PDF"}
                    </span>
                  </div>
                )}

                <button
                  aria-label={`Quitar ${item.name}`}
                  className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background shadow transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand"
                  onClick={() => uploads.remove(item.id)}
                  type="button"
                >
                  <CloseIcon className="size-3" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : null}

      {uploads.addError ? (
        <p className="text-xs text-danger" role="alert">
          {uploads.addError}
        </p>
      ) : null}
    </div>
  );
}
