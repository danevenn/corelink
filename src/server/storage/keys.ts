// Utilidades de saneado de claves/extensiones para el almacenamiento (Fase 9a).
//
// Centraliza la generación de claves únicas y el saneado de extensiones para
// que LocalDriver (al escribir) y el route handler `/api/files` (al leer) usen
// EXACTAMENTE las mismas reglas y no haya divergencias explotables.

import { randomUUID } from "node:crypto";

/** Extensiones permitidas, mapeadas desde el MIME ya validado aguas arriba. */
const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

/**
 * Deriva una extensión SEGURA a partir del contentType (preferente, ya
 * validado) con fallback al nombre original. Sólo devuelve caracteres
 * `[a-z0-9]` para impedir cualquier inyección en la ruta. Vacío si no se puede
 * determinar una extensión segura.
 */
export function safeExtension(contentType: string, filename: string): string {
  const fromMime = MIME_TO_EXT[contentType];
  if (fromMime) return fromMime;

  const dot = filename.lastIndexOf(".");
  if (dot === -1 || dot === filename.length - 1) return "";
  const raw = filename.slice(dot + 1).toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9]/g, "");
  return cleaned.slice(0, 8);
}

/**
 * Genera una clave única e impredecible para un objeto nuevo: `<uuid>.<ext>`.
 * El uuid evita colisiones y enumeración; la extensión (saneada) permite servir
 * el Content-Type correcto. La clave NO contiene separadores de ruta.
 */
export function newStorageKey(contentType: string, filename: string): string {
  const ext = safeExtension(contentType, filename);
  const id = randomUUID();
  return ext ? `${id}.${ext}` : id;
}

/**
 * Valida que una clave entrante (p.ej. desde la URL de `/api/files/<key>`) sea
 * un nombre de archivo plano y seguro: sólo `[a-zA-Z0-9._-]`, sin separadores
 * ni `..`. Devuelve la clave si es válida, o `null` para rechazar (evita path
 * traversal). No permite claves vacías ni con segmentos.
 */
export function sanitizeKey(key: string): string | null {
  if (!key || key.length > 200) return null;
  // Rechaza cualquier separador de ruta, recorrido y caracteres no permitidos.
  if (key.includes("/") || key.includes("\\") || key.includes("..")) {
    return null;
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(key)) return null;
  return key;
}
