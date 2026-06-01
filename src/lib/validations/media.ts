import { z } from "zod";

// Esquemas y límites del subsistema de multimedia (Fase 9a).
// Fuente de verdad de: tipos MIME permitidos, tamaño máximo, nº de adjuntos por
// contenido y la forma de un adjunto ya subido al enlazarlo a un post/mensaje.

// ── Tipos MIME permitidos ────────────────────────────────────────────────────
// Imágenes habituales + PDF (decisión: permitimos PDF como adjunto de documento,
// útil en una intranet; mismo límite de tamaño que imágenes para simplificar).
export const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

export type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

/** Tamaño máximo por archivo: 5 MB. Rechazo claro por encima. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Máximo de adjuntos por post o por mensaje. */
export const MAX_ATTACHMENTS_PER_CONTENT = 4;

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

// ── Adjunto ya subido, al enlazarlo a un post/mensaje ────────────────────────
// La capa de subida (`/api/upload`) ya validó MIME/tamaño y devolvió esto. Al
// crear el post/mensaje re-validamos forma y coherencia (defensa en profundidad:
// el cliente podría reenviar cualquier cosa). `url` y `key` provienen del driver.

const cuidLike = z.string().trim().min(1).max(256);

export const uploadedAttachmentSchema = z.object({
  /** URL pública servida por el driver de almacenamiento. */
  url: z.string().trim().min(1).max(2048),
  /** Clave interna del objeto en el storage (para borrarlo luego). */
  key: cuidLike,
  /** MIME real; debe estar en la lista permitida. */
  mime: z.enum(ALLOWED_MIME_TYPES),
  /** Tamaño en bytes; > 0 y <= máximo. */
  size: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES, "El archivo supera el tamaño máximo."),
});

export type UploadedAttachment = z.infer<typeof uploadedAttachmentSchema>;

/** Array opcional de adjuntos para enlazar (máx N). Reutilizable en post/chat. */
export const attachmentsInputSchema = z
  .array(uploadedAttachmentSchema)
  .max(
    MAX_ATTACHMENTS_PER_CONTENT,
    `No puedes adjuntar más de ${MAX_ATTACHMENTS_PER_CONTENT} archivos.`,
  )
  .optional();
