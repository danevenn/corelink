import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { anonymous, organization } from "better-auth/plugins";
import { prisma } from "@/lib/db";

// Better Auth — configuración del servidor (Fase 2).
// - Adapter Prisma (cliente generado en `@/generated/prisma`, vía singleton).
// - Email + password habilitado.
// - Plugin organization: estructura empresa + miembros + roles (red interna).
// - Plugin anonymous: "Entrar como invitado" para la demo pública.
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [organization(), anonymous()],
});
