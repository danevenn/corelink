// Driver de almacenamiento Vercel Blob (Fase 9a) — server-only.
//
// Stub FUNCIONAL listo para activarse en despliegue: usa `@vercel/blob`
// (`put`/`del`). NO se usa en local (allí el selector elige `localDriver`); se
// activa cuando `STORAGE_DRIVER=vercel-blob` o cuando existe
// `BLOB_READ_WRITE_TOKEN` en el entorno (lo provee la integración de Vercel).
//
// La URL devuelta por `put` es la URL pública del CDN de Blob (https://…),
// directamente consumible por la UI sin pasar por nuestro route handler. La
// `key` que persistimos es el `pathname` del blob, usado luego en `del`.

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
