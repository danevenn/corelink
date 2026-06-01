"use client";

// Hook de adjuntos en CLIENTE (Fase 9b).
//
// Gestiona la cola local de archivos que el usuario selecciona en un compositor
// (post o chat): valida en cliente, genera previews (object URL para imágenes),
// sube cada uno a `/api/upload` y expone su estado (uploading/done/error). El
// consumidor llama `uploadAll()` antes de enviar y obtiene los adjuntos listos
// (`{ url, key, mime, size }`) para `createPost`/`sendMessage`.
//
// Fugas de memoria: cada object URL de preview se revoca al quitar el item, al
// limpiar y al desmontar (efecto de limpieza sobre el ref de URLs vivas).

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isImageMime,
  MAX_ATTACHMENTS_PER_CONTENT,
  type UploadedFile,
  uploadFile,
  validateFile,
} from "@/lib/upload-client";

export type UploadStatus = "pending" | "uploading" | "done" | "error";

/** Un adjunto en la cola del compositor (antes/durante/después de subir). */
export type UploadItem = {
  /** Id local estable para keys de React. */
  id: string;
  file: File;
  name: string;
  mime: string;
  size: number;
  isImage: boolean;
  /** Object URL de preview (solo imágenes); null para PDF. */
  previewUrl: string | null;
  status: UploadStatus;
  /** Mensaje de error de subida (si status === "error"). */
  error: string | null;
  /** Resultado de subida (si status === "done"). */
  uploaded: UploadedFile | null;
};

export type UseUploadsResult = {
  items: UploadItem[];
  /** ¿Hay algún archivo en cola? */
  hasItems: boolean;
  /** ¿Alguno subiendo ahora mismo? (bloquea el envío). */
  isUploading: boolean;
  /** Mensaje de error de validación al añadir (p.ej. límite/ tipo). */
  addError: string | null;
  /** Añade `File`s respetando el límite; valida cada uno. */
  add: (files: FileList | File[]) => void;
  /** Quita un item por id (revoca su preview). */
  remove: (id: string) => void;
  /** Vacía la cola (revoca todas las previews). */
  clear: () => void;
  /**
   * Sube todos los pendientes/erróneos y devuelve los adjuntos listos, o `null`
   * si alguno falla (deja el item marcado en error para reintentar).
   */
  uploadAll: () => Promise<UploadedFile[] | null>;
};

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useUploads(): UseUploadsResult {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [addError, setAddError] = useState<string | null>(null);

  // Espejo de `items` para leerlos de forma fiable en callbacks asíncronos
  // (uploadAll) sin depender de leer estado dentro de un updater de setState,
  // que React puede ejecutar más tarde o dos veces (StrictMode). Mantener el ref
  // sincronizado en render es seguro: es un valor derivado del estado.
  const itemsRef = useRef<UploadItem[]>(items);
  itemsRef.current = items;

  // Conjunto de object URLs vivas, para revocarlas al desmontar sin depender de
  // que el estado siga montado en ese instante.
  const liveUrlsRef = useRef<Set<string>>(new Set());

  const revoke = useCallback((url: string | null) => {
    if (url && liveUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      liveUrlsRef.current.delete(url);
    }
  }, []);

  const add = useCallback((files: FileList | File[]) => {
    setAddError(null);
    const incoming = Array.from(files);
    if (incoming.length === 0) return;

    setItems((prev) => {
      const next = [...prev];
      for (const file of incoming) {
        if (next.length >= MAX_ATTACHMENTS_PER_CONTENT) {
          setAddError(
            `Solo puedes adjuntar ${MAX_ATTACHMENTS_PER_CONTENT} archivos.`,
          );
          break;
        }
        const validationError = validateFile(file);
        if (validationError) {
          setAddError(validationError);
          continue;
        }
        const image = isImageMime(file.type);
        let previewUrl: string | null = null;
        if (image) {
          previewUrl = URL.createObjectURL(file);
          liveUrlsRef.current.add(previewUrl);
        }
        next.push({
          id: newId(),
          file,
          name: file.name,
          mime: file.type,
          size: file.size,
          isImage: image,
          previewUrl,
          status: "pending",
          error: null,
          uploaded: null,
        });
      }
      return next;
    });
  }, []);

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => {
        const target = prev.find((i) => i.id === id);
        if (target) revoke(target.previewUrl);
        return prev.filter((i) => i.id !== id);
      });
    },
    [revoke],
  );

  const clear = useCallback(() => {
    setItems((prev) => {
      for (const i of prev) revoke(i.previewUrl);
      return [];
    });
    setAddError(null);
  }, [revoke]);

  const uploadAll = useCallback(async (): Promise<UploadedFile[] | null> => {
    // Snapshot fiable de los items a subir (vía ref, no leyendo en un updater).
    const snapshot = itemsRef.current;
    setItems((prev) =>
      prev.map((i) =>
        i.status === "done" ? i : { ...i, status: "uploading", error: null },
      ),
    );

    if (snapshot.length === 0) return [];

    const results = await Promise.all(
      snapshot.map(async (item) => {
        if (item.status === "done" && item.uploaded) {
          return { id: item.id, ok: true as const, value: item.uploaded };
        }
        try {
          const value = await uploadFile(item.file);
          return { id: item.id, ok: true as const, value };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "No se pudo subir.";
          return { id: item.id, ok: false as const, message };
        }
      }),
    );

    setItems((prev) =>
      prev.map((i) => {
        const r = results.find((x) => x.id === i.id);
        if (!r) return i;
        return r.ok
          ? { ...i, status: "done", uploaded: r.value, error: null }
          : { ...i, status: "error", error: r.message };
      }),
    );

    if (results.some((r) => !r.ok)) return null;
    return results.flatMap((r) => (r.ok ? [r.value] : []));
  }, []);

  // Revoca todas las previews vivas al desmontar.
  useEffect(() => {
    const live = liveUrlsRef.current;
    return () => {
      for (const url of live) URL.revokeObjectURL(url);
      live.clear();
    };
  }, []);

  return {
    items,
    hasItems: items.length > 0,
    isUploading: items.some((i) => i.status === "uploading"),
    addError,
    add,
    remove,
    clear,
    uploadAll,
  };
}
