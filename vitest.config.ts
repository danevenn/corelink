import { defineConfig } from "vitest/config";

// Config de Vitest para CoreLink (Capa 1 de testing).
//
// - Alias `@/*`: lo resuelve Vite de forma nativa (`resolve.tsconfigPaths`)
//   leyendo tsconfig.json (única fuente de verdad del alias).
// - Entorno por defecto `node`: los tests son server-side (Server Actions,
//   funciones puras de servidor). El único caso de UI (insertAtCursor) usa
//   `jsdom` localmente vía un comentario `// @vitest-environment jsdom` en su
//   archivo, sin cargar jsdom para toda la suite.
// - `.env.test`: lo cargamos con la API nativa de Node 24 (`process.loadEnvFile`,
//   mismo patrón que prisma.config.ts) ANTES de que Vitest evalúe los módulos:
//   db.ts/auth.ts leen DATABASE_URL en ámbito de módulo, así que debe estar en
//   process.env al importarse. El setup file añade los mocks globales.
// - Suites separadas por carpeta: tests/unit y tests/integration. Los scripts
//   `test:unit` / `test:integration` filtran por ruta.

// Carga .env.test en process.env (sin sobreescribir vars ya presentes en CI).
try {
  process.loadEnvFile(".env.test");
} catch {
  // En CI las variables ya vienen del entorno del job: no hay .env.test.
}

export default defineConfig({
  // Resolución nativa de los paths de tsconfig (`@/*`), sin el plugin externo.
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup/global.ts"],
    // Las suites de integración comparten una BD Postgres: las ejecutamos en
    // serie (un solo fork) para que el truncado entre tests no pise a otra suite
    // corriendo en paralelo. Las unitarias no tocan BD, pero el coste es ínfimo.
    fileParallelism: false,
    // El bus real abriría una conexión LISTEN/NOTIFY persistente; lo mockeamos en
    // el setup. Aun así, damos margen al arranque de Prisma en CI.
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["src/lib/**", "src/server/**"],
      exclude: [
        "src/generated/**",
        "src/**/*.d.ts",
        "src/server/events/pg-bus.ts",
      ],
    },
  },
});
