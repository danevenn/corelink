// Endpoint de SUBIDA de archivos (Fase 9a) — runtime nodejs.
//
// POST /api/upload  (multipart/form-data, campo `file`)
//   - Exige sesión (contenido interno).
//   - Valida MIME permitido y tamaño máximo ANTES de tocar el storage.
//   - Sube vía `getStorage().put(...)` (driver local en dev, Blob en prod).
//   - Devuelve `{ url, key, size, contentType }`. NO crea la fila Attachment:
//     eso ocurre al enlazar el adjunto al crear el post/mensaje.
//
// Por qué route handler y no Server Action: los uploads multipart se manejan de
// forma más robusta y con códigos HTTP claros vía `request.formData()`.
//
// Contrato de error coherente con el resto: `{ ok:false, error:{ message } }`
// con el código HTTP adecuado (401/400/413/415/500).

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isAllowedMime, MAX_UPLOAD_BYTES } from "@/lib/validations/media";
import { getStorage } from "@/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorBody = { ok: false; error: { message: string } };

function fail(message: string, status: number): Response {
  return Response.json({ ok: false, error: { message } } satisfies ErrorBody, {
    status,
  });
}

export async function POST(req: Request): Promise<Response> {
  // 1) Sesión obligatoria.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return fail("Debes iniciar sesión.", 401);
  }

  // 2) Parseo multipart.
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Cuerpo de la petición no válido (esperado multipart).", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return fail("Falta el archivo (campo `file`).", 400);
  }

  // 3) Validación de tamaño (rechazo temprano por el tamaño declarado).
  if (file.size <= 0) {
    return fail("El archivo está vacío.", 400);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail(
      `El archivo supera el tamaño máximo de ${Math.round(
        MAX_UPLOAD_BYTES / (1024 * 1024),
      )} MB.`,
      413,
    );
  }

  // 4) Validación de MIME (no nos fiamos sólo del declarado; comprobamos lista).
  const contentType = file.type || "application/octet-stream";
  if (!isAllowedMime(contentType)) {
    return fail(`Tipo de archivo no permitido: ${contentType}.`, 415);
  }

  // 5) Lectura de bytes y verificación REAL del tamaño (el size declarado podría
  //    mentir). Re-chequeamos contra el máximo tras materializar el buffer.
  let data: Buffer;
  try {
    const arrayBuffer = await file.arrayBuffer();
    data = Buffer.from(arrayBuffer);
  } catch {
    return fail("No se pudo leer el archivo.", 400);
  }
  if (data.byteLength > MAX_UPLOAD_BYTES) {
    return fail("El archivo supera el tamaño máximo.", 413);
  }

  // 6) Subida vía driver activo.
  try {
    const stored = await getStorage().put({
      data,
      filename: file.name || "archivo",
      contentType,
    });
    return Response.json(
      {
        ok: true,
        data: {
          url: stored.url,
          key: stored.key,
          size: stored.size,
          contentType: stored.contentType,
        },
      },
      { status: 201 },
    );
  } catch {
    return fail("No se pudo subir el archivo. Inténtalo de nuevo.", 500);
  }
}
