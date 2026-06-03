// globalSetup de Playwright: prepara la BD E2E (`corelink_e2e`) ANTES de la
// suite, dejándola en un estado conocido y reproducible:
//   1) `prisma migrate deploy` — aplica TODAS las migraciones (idempotente).
//   2) `prisma db seed` — RESIEMBRA (el seed limpia y recrea los datos demo).
//
// Cada ejecución parte así de cero: usuarios demo, canales, posts, reacciones,
// chats… Los specs que MUTAN (alta de empleado) usan datos únicos por ejecución
// para no colisionar con la resiembra.
//
// La BD E2E es SEPARADA de `corelink` (desarrollo) y `corelink_test`
// (unit/integración): este setup NUNCA las toca. Las envs E2E (incluida
// DATABASE_URL → corelink_e2e) se cargan desde `.env.e2e` en playwright.config.
//
// Ambos comandos heredan el `process.env` ya poblado por el config (dotenv), así
// que apuntan a `corelink_e2e`. El seed llama internamente a
// `process.loadEnvFile()`, que NO sobreescribe vars ya presentes en el entorno,
// por lo que respeta nuestra DATABASE_URL E2E.

import { execFileSync } from "node:child_process";

function run(args: string[]): void {
  execFileSync("pnpm", args, {
    stdio: "inherit",
    env: process.env,
  });
}

export default function globalSetup(): void {
  // Sanidad: jamás preparar nada que no sea la BD E2E (evita tocar dev/test por
  // un .env.e2e mal configurado).
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("corelink_e2e")) {
    throw new Error(
      `[e2e] DATABASE_URL no apunta a corelink_e2e (got: "${url}"). ` +
        "Revisa .env.e2e / la carga de entorno en playwright.config.ts.",
    );
  }

  console.log("\n[e2e] Preparando BD corelink_e2e (migrate deploy)…");
  run(["prisma", "migrate", "deploy"]);

  console.log("[e2e] Resembrando BD corelink_e2e (db seed)…");
  run(["prisma", "db", "seed"]);

  console.log("[e2e] BD corelink_e2e lista.\n");
}
