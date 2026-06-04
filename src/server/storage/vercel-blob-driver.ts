// Driver de almacenamiento Vercel Blob (Fase 9a) — server-only.
//
// Driver FUNCIONAL para producción: usa `@vercel/blob` (`put`/`del`). NO se usa
// en local (allí el selector elige `localDriver`); se activa cuando
// `STORAGE_DRIVER=vercel-blob` o cuando existe `BLOB_READ_WRITE_TOKEN` en el
// entorno (lo provee la integración de Vercel Blob). Requiere por tanto
// `BLOB_READ_WRITE_TOKEN` configurado en el proyecto Vercel (la integración lo
// inyecta automáticamente al conectar el store).
//
// La URL devuelta por `put` es la URL PÚBLICA del CDN de Blob
// (https://<id>.public.blob.vercel-storage.com/<key>), directamente consumible
// por la UI con `<img src=url>` sin pasar por nuestro route handler `/api/files`.
// No requiere `next/image` remotePatterns (usamos `<img>` directo) y la única
// CSP del proyecto es `frame-ancestors 'none'` (no hay `img-src`), así que el
// `<img>` cross-origin no queda bloqueado.
//
// La `key` que persistimos es el `pathname` del blob (p.ej. `<uuid>.png`),
// usado luego en `del`. El `del` de @vercel/blob v2 acepta tanto la URL como el
// pathname (`del(urlOrPathname)`), por lo que basta con la key para borrar.
//
// ENDURECIMIENTO FUTURO (no para la demo): para una app real con imágenes
// privadas se usaría `access: "private"` + lectura autenticada vía `get()`,
// sirviendo por un route handler auth-gated en lugar de la URL pública. Para una
// demo de portfolio, blob público es aceptable y mucho más simple/barato.

import { del, put } from "@vercel/blob";
import { newStorageKey } from "./keys";
import type { PutInput, StorageDriver, StoredObject } from "./types";

export const vercelBlobDriver: StorageDriver = {
  async put(input: PutInput): Promise<StoredObject> {
    // Reutilizamos el generador de claves para un pathname único y saneado.
    const key = newStorageKey(input.contentType, input.filename);
    const result = await put(key, input.data, {
      access: "public",
      contentType: input.contentType,
      // El token se toma de BLOB_READ_WRITE_TOKEN del entorno por defecto.
      addRandomSuffix: false,
    });
    return {
      url: result.url,
      // `pathname` es la clave estable para borrar después con `del`.
      key: result.pathname,
      size: input.data.byteLength,
      contentType: input.contentType,
    };
  },

  async delete(key: string): Promise<void> {
    // `del` acepta tanto la URL como el pathname. Idempotente en la práctica.
    await del(key);
  },
};
