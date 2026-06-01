// Abstracción de almacenamiento de archivos (Fase 9a) — server-only.
//
// Define el CONTRATO que cualquier backend de almacenamiento debe cumplir, sin
// filtrar detalles del proveedor (local FS, Vercel Blob, S3…). La capa de
// subida (`/api/upload`) y las acciones de dominio sólo conocen esta interfaz:
// cambiar de driver en producción es pura configuración de entorno, sin tocar
// el código que sube o enlaza adjuntos.

/** Datos de entrada para subir un objeto al almacenamiento. */
export type PutInput = {
  /** Bytes del archivo ya leídos en memoria (validados aguas arriba). */
  data: Buffer;
  /** Nombre original del archivo (se usa sólo para derivar la extensión). */
  filename: string;
  /** MIME real ya validado por la capa de subida. */
  contentType: string;
};

/**
 * Objeto almacenado. `key` es el identificador OPACO interno con el que el
 * driver localiza/borra el objeto (no asumas formato). `url` es la URL pública
 * (servida por nuestro route handler en local, o la CDN del proveedor en prod).
 */
export type StoredObject = {
  /** URL pública para servir el archivo. */
  url: string;
  /** Clave interna estable para `delete(key)`. Se persiste en `Attachment.key`. */
  key: string;
  /** Tamaño en bytes del objeto almacenado. */
  size: number;
  /** MIME con el que se guardó. */
  contentType: string;
};

/**
 * Contrato de un backend de almacenamiento. Intencionadamente mínimo: subir y
 * borrar. No expone rutas de disco, tokens ni detalles del proveedor.
 */
export type StorageDriver = {
  /** Sube los bytes y devuelve la descripción del objeto almacenado. */
  put(input: PutInput): Promise<StoredObject>;
  /** Borra el objeto identificado por `key`. Idempotente (no falla si no existe). */
  delete(key: string): Promise<void>;
};
