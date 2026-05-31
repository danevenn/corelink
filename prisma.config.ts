import path from "node:path";
import { defineConfig } from "prisma/config";

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
