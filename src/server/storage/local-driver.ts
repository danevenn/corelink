// Driver de almacenamiento LOCAL (Fase 9a) — server-only.
//
// Guarda los archivos en una carpeta del filesystem FUERA de `public/`
// (`.uploads/` en la raíz del proyecto, gitignorada). No usa `public/` porque
// no es escribible en runtime serverless y queremos paridad con producción.
//
// La URL pública NO es un path estático: apunta a nuestro route handler
// `/api/files/<key>`, que sirve el archivo con su Content-Type y exige sesión
// (el contenido es interno). Así el driver local se comporta como uno remoto:
// la app sólo ve una URL, nunca el filesystem.

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { newStorageKey, sanitizeKey } from "./keys";
import type { PutInput, StorageDriver, StoredObject } from "./types";

/** Carpeta de subidas, relativa al cwd del proceso (raíz del proyecto). */
const UPLOAD_DIR = path.join(process.cwd(), ".uploads");

/** Prefijo de URL pública servida por el route handler de archivos locales. */
const PUBLIC_PREFIX = "/api/files";

async function ensureDir(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Resuelve la ruta absoluta de una key DENTRO de `.uploads/`, rechazando
 * cualquier intento de salir del directorio (defensa en profundidad: la key ya
 * está saneada al crearse, pero re-verificamos antes de tocar el FS).
 */
function resolveSafePath(key: string): string | null {
  const safe = sanitizeKey(key);
  if (!safe) return null;
  const full = path.join(UPLOAD_DIR, safe);
  // Confirma que el path resuelto sigue bajo UPLOAD_DIR.
  const rel = path.relative(UPLOAD_DIR, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return full;
}

export const localDriver: StorageDriver = {
  async put(input: PutInput): Promise<StoredObject> {
    await ensureDir();
    const key = newStorageKey(input.contentType, input.filename);
    const full = resolveSafePath(key);
    if (!full) {
      // No debería ocurrir: newStorageKey produce claves seguras.
      throw new Error("Clave de almacenamiento no válida.");
    }
    await writeFile(full, input.data);
    return {
      url: `${PUBLIC_PREFIX}/${key}`,
      key,
      size: input.data.byteLength,
      contentType: input.contentType,
    };
  },

  async delete(key: string): Promise<void> {
    const full = resolveSafePath(key);
    if (!full) return; // Clave inválida: nada que borrar.
    try {
      await unlink(full);
    } catch (err) {
      // Idempotente: si ya no existe, no es un error.
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  },
};

/** Exportado para que el route handler `/api/files` localice los archivos. */
export { resolveSafePath, UPLOAD_DIR };
