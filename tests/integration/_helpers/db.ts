// Helper de BD para tests de integración.
//
// `resetDb()` deja la BD de test en estado limpio TRUNCANDO todas las tablas de
// aplicación (dominio + auth) en una sola sentencia con CASCADE. Es más rápido y
// fiable que borrar fila a fila respetando FKs, y reinicia las secuencias.
//
// Estrategia (decisión documentada): TRUNCATE entre tests, NO transacción por
// test. Razón: las Server Actions usan el cliente Prisma singleton (`@/lib/db`)
// con su propio pool; envolver cada test en una transacción exigiría inyectar el
// `tx` en cada action (cambio invasivo en producción). TRUNCATE ... RESTART
// IDENTITY CASCADE sobre todas las tablas es simple, aislado y suficiente: cada
// test (o `beforeEach`) parte de una BD vacía y siembra lo que necesita.
//
// NUNCA se ejecuta contra la BD de desarrollo: el `DATABASE_URL` viene de
// `.env.test` (corelink_test). Como guarda extra, abortamos si la URL no apunta
// a una base cuyo nombre contenga "test".

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

let tablesCache: string[] | null = null;

function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (!/\/[^/?]*test[^/?]*(\?|$)/i.test(url)) {
    throw new Error(
      `Negativa de seguridad: DATABASE_URL no apunta a una BD de test (${url}). ` +
        "Los tests de integración solo deben correr contra corelink_test.",
    );
  }
}

/** Lista las tablas BASE del esquema public, excluyendo las de migraciones. */
async function listTables(): Promise<string[]> {
  if (tablesCache) return tablesCache;
  const rows = await prisma.$queryRaw<{ tablename: string }[]>(
    Prisma.sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename NOT LIKE '_prisma_%'
    `,
  );
  tablesCache = rows.map((r) => r.tablename);
  return tablesCache;
}

/** Vacía todas las tablas de aplicación y reinicia identidades. */
export async function resetDb(): Promise<void> {
  assertTestDatabase();
  const tables = await listTables();
  if (tables.length === 0) return;
  const quoted = tables.map((t) => `"public"."${t}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`,
  );
}

/** Cierra el pool de Prisma al final de la suite (evita handles colgados). */
export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
}
