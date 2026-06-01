"use client";

// Galería de adjuntos — compartida por posts y chat (Fase 9b, DRY).
//
// Render adaptable de imágenes (1 grande; 2-4 en grid) + chips de PDF. Las
// imágenes reservan aspect-ratio para evitar layout shift y abren un lightbox
// accesible al hacer click. Los PDF son enlaces de descarga (mismo origen,
// requieren sesión para servirse). Acepta la forma común de `AttachmentView` /
// `ChatAttachmentView` (id, url, mime, size, width?, height?).

import { useState } from "react";
import { DownloadIcon, FileIcon } from "@/components/feed/icons";
import { isImageMime } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { Lightbox, type LightboxImage } from "./lightbox";

export type GalleryAttachment = {
  id: string;
  url: string;
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
};

type Props = {
  attachments: GalleryAttachment[];
  /** Para el `alt` de imágenes sin texto alternativo real. */
  authorName: string;
  /** Más compacto (burbujas de chat) vs. ancho completo (posts). */
  variant?: "post" | "chat";
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileNameFromUrl(url: string): string {
  try {
    const last = url.split("/").pop() ?? "documento";
    return decodeURIComponent(last) || "documento";
  } catch {
    return "documento";
  }
}

export function AttachmentGallery({
  attachments,
  authorName,
  variant = "post",
}: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => isImageMime(a.mime));
  const pdfs = attachments.filter((a) => !isImageMime(a.mime));

  const lightboxImages: LightboxImage[] = images.map((img) => ({
    url: img.url,
    alt: `Imagen adjunta de ${authorName}`,
  }));

  const count = images.length;
  // Grid: 1 → grande; 2 → dos columnas; 3-4 → dos columnas (4 = 2x2).
  const gridClass =
    count === 1 ? "grid-cols-1" : count === 3 ? "grid-cols-2" : "grid-cols-2";

  return (
    <div className={cn("flex flex-col gap-2", variant === "chat" && "mt-1")}>
      {count > 0 ? (
        <div
          className={cn(
            "grid gap-1.5 overflow-hidden rounded-xl",
            gridClass,
            variant === "chat" && "max-w-[16rem]",
          )}
        >
          {images.map((img, i) => {
            // En 3 imágenes, la primera ocupa toda la fila superior.
            const spanFull = count === 3 && i === 0;
            return (
              <button
                aria-label={`Ampliar imagen adjunta de ${authorName}`}
                className={cn(
                  "group relative block overflow-hidden rounded-lg bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand",
                  count === 1 ? "aspect-auto" : "aspect-square",
                  spanFull && "col-span-2",
                )}
                key={img.id}
                onClick={() => setLightboxIndex(i)}
                type="button"
              >
                {/* <img> directo: /api/files es dinámico, same-origin y
                    auth-gated; next/image aporta poco y width/height puede ser
                    null. lazy + dimensiones cuando existen evitan layout shift. */}
                {/* biome-ignore lint/performance/noImgElement: ruta dinámica auth-gated same-origin. */}
                <img
                  alt={`Imagen adjunta de ${authorName}`}
                  className={cn(
                    "h-full w-full transition group-hover:opacity-95",
                    count === 1
                      ? "max-h-[28rem] object-contain"
                      : "object-cover",
                  )}
                  decoding="async"
                  height={img.height ?? undefined}
                  loading="lazy"
                  src={img.url}
                  width={img.width ?? undefined}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {pdfs.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {pdfs.map((pdf) => {
            const name = fileNameFromUrl(pdf.url);
            return (
              <li key={pdf.id}>
                <a
                  className={cn(
                    "inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand",
                    variant === "chat" && "max-w-[16rem]",
                  )}
                  download
                  href={pdf.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <FileIcon className="size-5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{name}</span>
                    <span className="block text-xs text-muted-foreground">
                      PDF · {formatSize(pdf.size)}
                    </span>
                  </span>
                  <DownloadIcon className="size-4 shrink-0 text-muted-foreground" />
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}

      {lightboxIndex !== null ? (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      ) : null}
    </div>
  );
}
