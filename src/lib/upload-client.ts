// Utilidad de subida en CLIENTE (Fase 9b).
//
// Envuelve `POST /api/upload` (multipart, campo `file`) por cada archivo y
// normaliza la respuesta a `{ url, key, mime, size }`, la forma exacta que
// esperan `createPost`/`sendMessage` en `attachments`.
//
// La validación de MIME/tamaño/nº también vive en el servidor (fuente de
// verdad); aquí la replicamos ANTES de subir solo para dar feedback inmediato y
// evitar viajes innecesarios. Reutiliza las constantes de `validations/media`.

import {
  ALLOWED_MIME_TYPES,
  type AllowedMime,
  isAllowedMime,
  MAX_ATTACHMENTS_PER_CONTENT,
  MAX_UPLOAD_BYTES,
} from "@/lib/validations/media";

/** Adjunto ya subido, listo para enlazar a un post/mensaje. */
export type UploadedFile = {
  url: string;
  key: string;
  mime: AllowedMime;
  size: number;
  /**
   * Dimensiones finales calculadas por el servidor con sharp (px). El backend es
   * la fuente de verdad; el cliente solo las reenvía a createPost/sendMessage
   * para persistirlas en Attachment (evita layout shift). Ausentes en no-imágenes.
   */
  width?: number;
  height?: number;
};

/** `accept` del input file derivado de los MIME permitidos. */
export const UPLOAD_ACCEPT = ALLOWED_MIME_TYPES.join(",");

export { MAX_ATTACHMENTS_PER_CONTENT, MAX_UPLOAD_BYTES };

/** Tamaño máximo formateado en MB para mensajes de usuario. */
export const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

/** ¿Es una imagen (vs. PDF u otro)? Útil para decidir preview vs. chip. */
export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

/**
 * Valida un único `File` en cliente. Devuelve un mensaje de error legible o
 * `null` si es válido. NO sustituye la validación del servidor.
 */
export function validateFile(file: File): string | null {
  const type = file.type || "application/octet-stream";
  if (!isAllowedMime(type)) {
    return `«${file.name}»: tipo no permitido. Usa imágenes (PNG, JPEG, WebP, GIF) o PDF.`;
  }
  if (file.size <= 0) {
    return `«${file.name}» está vacío.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `«${file.name}» supera el máximo de ${MAX_UPLOAD_MB} MB.`;
  }
  return null;
}

type UploadOkBody = {
  ok: true;
  data: {
    url: string;
    key: string;
    size: number;
    contentType: string;
    width?: number | null;
    height?: number | null;
  };
};
type UploadErrBody = { ok: false; error: { message: string } };

/**
 * Sube un único archivo. Lanza `Error` con mensaje legible si falla (lo captura
 * el hook). El `mime` devuelto es el confirmado por el servidor (contentType).
 */
export async function uploadFile(
  file: File,
  signal?: AbortSignal,
): Promise<UploadedFile> {
  const form = new FormData();
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/upload", {
      method: "POST",
      body: form,
      signal,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor.");
  }

  let body: UploadOkBody | UploadErrBody | null = null;
  try {
    body = (await res.json()) as UploadOkBody | UploadErrBody;
  } catch {
    body = null;
  }

  if (!res.ok || !body || body.ok !== true) {
    const message =
      body && body.ok === false
        ? body.error.message
        : "No se pudo subir el archivo.";
    throw new Error(message);
  }

  const mime = body.data.contentType;
  if (!isAllowedMime(mime)) {
    throw new Error("El servidor devolvió un tipo no permitido.");
  }

  return {
    url: body.data.url,
    key: body.data.key,
    mime,
    size: body.data.size,
    // Reenviamos las dimensiones que calculó el servidor (si las hay) para que
    // createPost/sendMessage las persistan. `?? undefined` colapsa null a opcional.
    width: body.data.width ?? undefined,
    height: body.data.height ?? undefined,
  };
}
