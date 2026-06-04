// Endpoint de RESETEO de la demo (Fase 12) — runtime nodejs.
//
// GET /api/cron/reset-demo
//   - Pensado para un Vercel Cron: resiembra la BD demo al estado semilla
//     reutilizando `seedDatabase()` (la MISMA lógica que `pnpm db:seed`), sin
//     spawnear un proceso. `seedDatabase()` limpia (reset) y repuebla, así que
//     deja la demo en un estado conocido y reproducible cada ejecución.
//   - PROTEGIDO por `CRON_SECRET`: Vercel Cron invoca el endpoint enviando la
//     cabecera `Authorization: Bearer <CRON_SECRET>`. Validamos contra la env
//     `CRON_SECRET`; si no coincide → 401. Así nadie externo puede resetear la
//     demo accediendo a la URL.
//   - Ruta DINÁMICA forzada: nunca se prerenderiza ni cachea (tiene efectos de
//     escritura y depende de la cabecera de autorización en runtime).
//
// El cron schedule (cuándo se dispara) lo configura el archivo de Vercel
// (vercel.json/vercel.ts) en OTRO sitio; aquí solo vive el endpoint. Debe
// apuntar a `/api/cron/reset-demo`.

import { seedDatabase } from "../../../../../prisma/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Comprobación timing-safe de igualdad de strings para no filtrar el largo del
 * secreto vía el tiempo de comparación. Evita `===` (early-exit) en el secreto.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function GET(req: Request): Promise<Response> {
  // 1) Autorización: exige `Authorization: Bearer <CRON_SECRET>`.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Sin secreto configurado, el endpoint NO debe poder ejecutarse: fallamos
    // cerrado (mejor 500 que dejar la demo reseteable por cualquiera).
    console.error("[reset-demo] CRON_SECRET no está definida; rechazando.");
    return Response.json(
      { ok: false, error: "CRON_SECRET no configurado en el servidor." },
      { status: 500 },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!safeEqual(header, expected)) {
    return Response.json(
      { ok: false, error: "No autorizado." },
      { status: 401 },
    );
  }

  // 2) Resiembra (reset + seed). `seedDatabase()` es idempotente.
  try {
    await seedDatabase();
    const reseededAt = new Date().toISOString();
    console.log(
      `[reset-demo] Demo reseteada correctamente a las ${reseededAt}`,
    );
    return Response.json({ ok: true, reseededAt }, { status: 200 });
  } catch (err) {
    console.error("[reset-demo] Error al resembrar la demo:", err);
    return Response.json(
      { ok: false, error: "No se pudo resembrar la demo." },
      { status: 500 },
    );
  }
}
