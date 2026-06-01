// Route handler que SIRVE archivos locales (Fase 9a) — runtime nodejs.
//
// GET /api/files/<key>  → lee el objeto de `.uploads/` y lo devuelve con su
// Content-Type y cache headers. Es la contraparte de la URL que `localDriver`
// publica. En producción con Vercel Blob, las URLs apuntan al CDN y NO pasan por
// aquí (este handler sólo sirve el driver local).
//
// Seguridad:
//   - EXIGE sesión: el contenido es interno (la app es privada). Sin sesión → 401.
//   - Protección contra path traversal: la key se SANEA (sólo nombre plano,
//     sin `/`, `\` ni `..`) y se resuelve confinada a `.uploads/`. Cualquier
//     intento de salir → 400/404.
//   - 404 si el archivo no existe.
//
// La ruta es catch-all (`[...key]`) por robustez de matching, pero sólo
// aceptamos un ÚNICO segmento (las keys del driver no contienen separadores).

import type { ReadStream } from "node:fs";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { safeExtension } from "@/server/storage/keys";
import { resolveSafePath } from "@/server/storage/local-driver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// MIME por extensión para servir con el Content-Type correcto. Conservador:
// sólo los tipos que el subsistema permite subir.
const EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

function contentTypeForKey(key: string): string {
  const ext = safeExtension("", key);
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  // Sesión obligatoria: contenido interno.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("No autenticado.", { status: 401 });
  }

  const { key: segments } = await ctx.params;
  // Sólo aceptamos un único segmento plano. Más segmentos = key inválida.
  if (segments?.length !== 1) {
    return new Response("No encontrado.", { status: 404 });
  }
  const key = segments[0] ?? "";

  // Resuelve la ruta confinada a `.uploads/` (sanea + verifica traversal).
  const full = resolveSafePath(key);
  if (!full) {
    return new Response("Petición no válida.", { status: 400 });
  }

  let size: number;
  try {
    const info = await stat(full);
    if (!info.isFile()) {
      return new Response("No encontrado.", { status: 404 });
    }
    size = info.size;
  } catch {
    return new Response("No encontrado.", { status: 404 });
  }

  // Stream del archivo (no lo cargamos entero en memoria).
  const nodeStream: ReadStream = createReadStream(full);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentTypeForKey(key),
      "Content-Length": String(size),
      // Inmutable: las keys son únicas (uuid), el contenido nunca cambia.
      // `private` porque requiere sesión: no debe cachearse en proxies/CDN.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
