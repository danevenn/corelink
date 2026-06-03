import { defineConfig, devices } from "@playwright/test";

// Config de Playwright para CoreLink (Capa 2 de testing: E2E en navegador real).
//
// ── Entorno ──────────────────────────────────────────────────────────────────
// Cargamos `.env.e2e` (gitignored) en `process.env` ANTES de definir el config,
// con la API nativa de Node 24 (mismo patrón que vitest.config / prisma.config).
// Así tanto el globalSetup (migrate/seed) como el webServer (next build/start)
// heredan DATABASE_URL → corelink_e2e y el resto de envs E2E. En CI no hay
// `.env.e2e`: las variables ya vienen del entorno del job.
try {
  process.loadEnvFile(".env.e2e");
} catch {
  // En CI las variables E2E vienen del entorno del job (ver ci.yml).
}

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  // Patrón de specs E2E (evita que Playwright recoja los .test.ts de Vitest).
  testMatch: /.*\.spec\.ts/,

  // Estado conocido antes de la suite: migra + resiembra corelink_e2e.
  globalSetup: "./tests/e2e/global-setup.ts",

  // En CI fallamos si alguien dejó un `test.only`; reintentos solo en CI para
  // absorber flakiness puntual de red/arranque (los tests son deterministas).
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // En CI un único worker: la app comparte una BD y el seed deja un estado fijo;
  // serializar evita que dos tests pisen el MISMO dato (p. ej. reacciones sobre
  // el mismo post sembrado). En local Playwright paraleliza por defecto, pero
  // mantenemos workers=1 para reproducibilidad del estado sembrado.
  workers: 1,
  fullyParallel: false,

  // Timeouts razonables: la app hace build de producción y SSR con Postgres.
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: process.env.CI
    ? [["html", { open: "never" }], ["list"]]
    : [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    // Diagnóstico solo cuando algo falla (mantiene la suite rápida y los
    // artefactos pequeños).
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Arranque del servidor bajo test: BUILD DE PRODUCCIÓN (más fiable que dev —
  // sin overlays de error, sin recompilación en caliente, comportamiento de
  // prod). El servidor hereda las envs E2E cargadas arriba (DATABASE_URL →
  // corelink_e2e). En local reutilizamos un server ya levantado si lo hay.
  webServer: {
    command: "pnpm build && pnpm start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? BASE_URL,
      STORAGE_DRIVER: process.env.STORAGE_DRIVER ?? "local",
      NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE ?? "true",
      NEXT_TELEMETRY_DISABLED: "1",
      // Desactiva el rate limiting de Better Auth en E2E (muchos logins seguidos).
      E2E_DISABLE_RATE_LIMIT: process.env.E2E_DISABLE_RATE_LIMIT ?? "true",
    },
  },
});
