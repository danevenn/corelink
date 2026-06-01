// Selector de driver de almacenamiento (Fase 9a) — server-only.
//
// Punto de entrada ÚNICO de la abstracción: el resto de la app llama a
// `getStorage()` y obtiene un `StorageDriver` sin saber cuál. Cambiar de backend
// en despliegue es sólo configurar entorno; el código de subida/enlace no cambia.
//
// Reglas de selección (en orden):
//   1. `STORAGE_DRIVER=local`        → driver local (filesystem `.uploads/`).
//   2. `STORAGE_DRIVER=vercel-blob`  → driver Vercel Blob (exige token).
//   3. Sin STORAGE_DRIVER pero CON `BLOB_READ_WRITE_TOKEN` → Vercel Blob.
//   4. Por defecto                   → local.
//
// En local dejamos `STORAGE_DRIVER=local` en `.env`. Documentado en `.env.example`.

import { localDriver } from "./local-driver";
import type { StorageDriver } from "./types";
import { vercelBlobDriver } from "./vercel-blob-driver";

export type { PutInput, StorageDriver, StoredObject } from "./types";

export type StorageDriverName = "local" | "vercel-blob";

/** Resuelve qué driver usar a partir del entorno (sin instanciar nada caro). */
export function resolveDriverName(): StorageDriverName {
  const explicit = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (explicit === "local") return "local";
  if (explicit === "vercel-blob") return "vercel-blob";
  // Sin selección explícita: si hay token de Blob, asumimos Blob; si no, local.
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  return "local";
}

/**
 * Devuelve el driver de almacenamiento activo. Los drivers son objetos sin
 * estado (stateless), así que no necesitamos cachear instancias.
 */
export function getStorage(): StorageDriver {
  switch (resolveDriverName()) {
    case "vercel-blob":
      return vercelBlobDriver;
    default:
      return localDriver;
  }
}
