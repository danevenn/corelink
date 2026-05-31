import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 ya no auto-carga el .env. Lo cargamos con la API nativa de Node 24
// (process.loadEnvFile) para que las migraciones funcionen sin sourcing manual.
// En entornos sin .env (p.ej. producción/CI con vars ya en el entorno) se ignora.
try {
  process.loadEnvFile();
} catch {
  // .env no presente: se usan las variables ya definidas en el entorno.
}

// Prisma 7: configuración de datasource, migraciones y seed.
// La connection URL se lee de DATABASE_URL (ver .env / .env.example).
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
