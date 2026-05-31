import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, anonymous, organization } from "better-auth/plugins";
import { prisma } from "@/lib/db";

// Better Auth — configuración del servidor (Fase 2 + Fase 6a).
// - Adapter Prisma (cliente generado en `@/generated/prisma`, vía singleton).
// - Email + password habilitado.
// - Plugin organization: estructura empresa + miembros + roles (red interna).
// - Plugin anonymous: "Entrar como invitado" para la demo pública.
// - Plugin admin (Fase 6a): añade `role`/`banned`/`banReason`/`banExpires` al
//   User. Define los roles `user` (default) / `moderator` / `admin`.
//
// Modelo de roles (decisión Fase 6a):
//   - Usamos el plugin `admin` SOLO por sus campos de schema y por el rol
//     `admin` con sus poderes nativos (banear, impersonar, gestionar usuarios).
//   - `moderator` es un rol de DOMINIO (staff de moderación) que NO debe heredar
//     los poderes destructivos del admin de Better Auth. Por eso `adminRoles`
//     queda solo en `["admin"]`. La capacidad de "moderar" (marcar oficial,
//     Fase 6b; panel moderación, Fase 10) se decide con nuestro helper
//     `canModerate()` en `src/server/authz.ts`, que considera staff a
//     admin + moderator. Así separamos "es admin de la plataforma" de
//     "puede moderar contenido".
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization(),
    anonymous(),
    admin({
      // Rol por defecto al registrarse (menor privilegio).
      defaultRole: "user",
      // Qué roles obtienen los poderes nativos del plugin admin de Better Auth.
      // `moderator` NO los obtiene: su capacidad de moderar es de dominio.
      adminRoles: ["admin"],
    }),
  ],
});

/** Roles de la plataforma. `user` es el menor privilegio (default). */
export type AppRole = "user" | "moderator" | "admin";
