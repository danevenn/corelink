// Recolección de basura (GC) de archivos físicos del almacenamiento — server-only.
//
// El cascade de Prisma borra las filas `Attachment` de la BD al eliminar su
// post/respuesta/usuario, pero NO toca el OBJETO físico en el storage (FS local
// en dev, Blob en prod). Este helper cierra ese hueco: dadas unas `key`, borra
// los objetos correspondientes vía el driver activo.
//
// Política BEST-EFFORT: un fallo al borrar un archivo NUNCA debe tumbar la
// operación de dominio (ya completada en BD). Cada borrado se aísla; los errores
// se loguean y se continúa. Es la decisión correcta: una fila ya borrada con su
// archivo huérfano es un coste de almacenamiento menor, no una inconsistencia
// que el usuario deba sufrir como un error.

import { getStorage } from "./index";

/**
 * Borra del storage los objetos identificados por `keys`, best-effort.
 * Deduplica, ignora vacíos y aísla cada borrado. No lanza nunca.
 */
export async function deleteAttachmentsFromStorage(
  keys: Array<string | null | undefined>,
): Promise<void> {
  const unique = [
    ...new Set(keys.filter((k): k is string => !!k && k.length > 0)),
  ];
  if (unique.length === 0) return;

  const storage = getStorage();
  await Promise.all(
    unique.map(async (key) => {
      try {
        await storage.delete(key);
      } catch (err) {
        // Best-effort: registramos y seguimos. No propagamos.
        console.error(
          `[gc] No se pudo borrar el objeto «${key}» del storage.`,
          err,
        );
      }
    }),
  );
}
