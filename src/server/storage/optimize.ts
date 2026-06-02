// Optimización de imágenes en la SUBIDA (Mejora de almacenamiento) — server-only.
//
// Procesa los bytes de un archivo ANTES de entregarlos al driver de
// almacenamiento (`getStorage().put`). El objetivo es doble:
//   1. REDUCIR PESO: las imágenes raster (PNG/JPEG/WebP) se reescalan si su lado
//      mayor supera `MAX_DIMENSION` y se recodifican a WebP con calidad `WEBP_QUALITY`.
//   2. EVITAR LAYOUT SHIFT: extraemos width/height FINALES para persistirlos en
//      Attachment, de modo que el front pueda reservar el hueco de la imagen.
//
// Reglas por tipo (documentadas):
//   - `image/png` | `image/jpeg` | `image/webp`  → resize (solo reducción) + WebP.
//   - `image/gif`  → SE RESPETA TAL CUAL. Convertir a WebP estático perdería la
//     animación; sharp animado añade complejidad/peso y no aporta aquí. Aun así
//     intentamos LEER sus dimensiones (sin recodificar) para rellenar width/height.
//   - `application/pdf` y cualquier no-imagen → INTACTO, sin tocar bytes ni dimensiones.
//
// Manejo de errores (decisión): si sharp falla procesando una imagen que
// SÍ deberíamos optimizar, hacemos FALLBACK al original (no rechazamos la
// subida). Un fallo de optimización no debe impedir adjuntar un archivo válido;
// se sube tal cual y simplemente no llevará width/height. Se loguea para
// diagnóstico. El límite de tamaño lo re-verifica el route handler tras esto.

import sharp from "sharp";

/** Lado mayor permitido tras el resize. Imágenes más pequeñas NO se agrandan. */
export const MAX_DIMENSION = 1600;

/** Calidad WebP elegida: equilibrio peso/calidad para contenido de intranet. */
export const WEBP_QUALITY = 80;

/** MIME de imágenes raster que recodificamos a WebP. */
const RASTER_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Resultado de optimizar: bytes (quizá nuevos), su MIME y dimensiones finales. */
export type OptimizedImage = {
  /** Bytes a almacenar (recodificados si se optimizó; originales si no). */
  data: Buffer;
  /** MIME resultante (`image/webp` si se recodificó; el original si no). */
  contentType: string;
  /** Nombre sugerido para derivar la extensión/key (extensión `.webp` si aplica). */
  filename: string;
  /** Ancho final en px, si se pudo determinar. */
  width: number | null;
  /** Alto final en px, si se pudo determinar. */
  height: number | null;
};

/** Sustituye la extensión del filename por `.webp` (para una key/extensión correctas). */
function toWebpFilename(filename: string): string {
  const base = filename.replace(/\.[^./\\]*$/, "");
  const safeBase = base.length > 0 ? base : "imagen";
  return `${safeBase}.webp`;
}

/**
 * Optimiza (si procede) los bytes de un archivo ya validado por la capa de
 * subida. NUNCA lanza: ante cualquier problema devuelve el original sin
 * dimensiones, para no romper el flujo de subida.
 */
export async function optimizeUpload(input: {
  data: Buffer;
  filename: string;
  contentType: string;
}): Promise<OptimizedImage> {
  const { data, filename, contentType } = input;

  // No-imagen (PDF, etc.) o GIF animado: no recodificamos.
  if (contentType === "application/pdf" || !contentType.startsWith("image/")) {
    return { data, contentType, filename, width: null, height: null };
  }

  // GIF: respetar tal cual (posible animación). Intentar leer dimensiones.
  if (contentType === "image/gif") {
    const dims = await readDimensions(data);
    return {
      data,
      contentType,
      filename,
      width: dims.width,
      height: dims.height,
    };
  }

  // Imágenes raster recodificables (PNG/JPEG/WebP) → resize + WebP.
  if (RASTER_MIMES.has(contentType)) {
    try {
      // `failOn:"none"` tolera imágenes ligeramente corruptas (mejor que abortar).
      // `rotate()` aplica la orientación EXIF para que width/height sean los reales.
      const pipeline = sharp(data, { failOn: "none" }).rotate().resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside", // mantiene aspecto, encaja DENTRO del cuadro
        withoutEnlargement: true, // NO agranda las pequeñas
      });

      const { data: out, info } = await pipeline
        .webp({ quality: WEBP_QUALITY })
        .toBuffer({ resolveWithObject: true });

      return {
        data: out,
        contentType: "image/webp",
        filename: toWebpFilename(filename),
        width: info.width ?? null,
        height: info.height ?? null,
      };
    } catch (err) {
      // Fallback: subir el original sin dimensiones. No rompemos la subida.
      console.error("[optimizeUpload] sharp falló; subo el original.", err);
      return { data, contentType, filename, width: null, height: null };
    }
  }

  // Cualquier otro tipo de imagen no contemplado: intacto + dimensiones si se pueden.
  const dims = await readDimensions(data);
  return {
    data,
    contentType,
    filename,
    width: dims.width,
    height: dims.height,
  };
}

/** Lee dimensiones sin recodificar. Best-effort: null/null si sharp no puede. */
async function readDimensions(
  data: Buffer,
): Promise<{ width: number | null; height: number | null }> {
  try {
    const meta = await sharp(data, { failOn: "none" }).metadata();
    return { width: meta.width ?? null, height: meta.height ?? null };
  } catch {
    return { width: null, height: null };
  }
}
