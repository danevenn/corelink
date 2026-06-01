// Endpoint SSE genérico de tiempo real (Fase 7a).
//
// GET /api/events — abre un stream Server-Sent Events para el usuario actual y
// le entrega cada `AppEvent` publicado al bus para SU userId. Es GENÉRICO: hoy
// transporta notificaciones; la Fase 8 (chat) reutilizará este mismo endpoint
// para eventos de mensaje/typing sin cambios (la unión `AppEvent` crece, el
// transporte no).
//
// Decisiones:
//   - runtime "nodejs": el bus usa un `pg.Client` TCP de larga vida (LISTEN),
//     incompatible con el runtime Edge. Además SSE necesita streaming largo.
//   - Ruta DINÁMICA forzada: nunca se debe prerender/cachear un stream.
//   - Heartbeat cada 25s (comentario `: ping`) para mantener viva la conexión
//     y evitar que proxies/balanceadores corten por inactividad.
//   - Limpieza determinista: al cerrar el cliente (`req.signal` abort) o al
//     cancelar el stream, hacemos unsubscribe del bus y limpiamos el intervalo.

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { type AppEvent, eventBus } from "@/server/events/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

export async function GET(req: Request): Promise<Response> {
  // Autenticación: sin sesión, no hay stream.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("No autenticado.", { status: 401 });
  }
  const userId = session.user.id;

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let unsubscribe: (() => void) | null = null;
      let heartbeat: ReturnType<typeof setInterval> | null = null;

      const safeEnqueue = (chunk: string): void => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // El controller puede estar ya cerrado en una carrera de cierre.
          cleanup();
        }
      };

      const cleanup = (): void => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (unsubscribe) unsubscribe();
        try {
          controller.close();
        } catch {
          // Ya cerrado; ignorar.
        }
      };

      // Comentario inicial: fuerza el envío de cabeceras y "abre" el stream en
      // el cliente de inmediato (algunos navegadores esperan al primer byte).
      safeEnqueue(": connected\n\n");

      // Suscripción al bus para los eventos de ESTE usuario.
      unsubscribe = eventBus.subscribe(userId, (event: AppEvent) => {
        // Formato SSE: línea `event:` con el tipo (para `addEventListener`) y
        // `data:` con el JSON del evento. Doble salto de línea = fin de mensaje.
        safeEnqueue(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      });

      // Heartbeat keep-alive.
      heartbeat = setInterval(() => {
        safeEnqueue(": ping\n\n");
      }, HEARTBEAT_MS);

      // Cierre por desconexión del cliente.
      req.signal.addEventListener("abort", cleanup);
    },

    cancel() {
      // Se invoca si el consumidor cancela la lectura del stream; la limpieza
      // real ocurre en `start`/`cleanup` vía el abort signal, pero dejamos el
      // hook por contracto de ReadableStream.
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // Sin caché ni transformación de proxies (evita buffering de respuesta).
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Desactiva el buffering de nginx si actúa de proxy inverso.
      "X-Accel-Buffering": "no",
    },
  });
}
