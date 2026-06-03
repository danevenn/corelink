// Script STANDALONE para preparar la BD E2E a mano (fuera de Playwright):
//   pnpm test:e2e:setup
//
// Carga `.env.e2e`, valida que DATABASE_URL apunta a corelink_e2e y ejecuta
// migrate deploy + seed. Útil para depurar el estado de la BD sin arrancar la
// suite. La suite normal NO necesita esto: el globalSetup de Playwright hace lo
// mismo automáticamente (con las envs ya cargadas por el config).

import { execFileSync } from "node:child_process";

try {
  process.loadEnvFile(".env.e2e");
} catch {
  // En CI las variables vienen del entorno del job.
}

const url = process.env.DATABASE_URL ?? "";
if (!url.includes("corelink_e2e")) {
  console.error(
    `[e2e] DATABASE_URL no apunta a corelink_e2e (got: "${url}"). Abortando.`,
  );
  process.exit(1);
}

function run(args: string[]): void {
  execFileSync("pnpm", args, { stdio: "inherit", env: process.env });
}

console.log("[e2e] migrate deploy → corelink_e2e");
run(["prisma", "migrate", "deploy"]);
console.log("[e2e] db seed → corelink_e2e");
run(["prisma", "db", "seed"]);
console.log("[e2e] Listo.");
