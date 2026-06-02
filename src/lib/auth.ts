import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, organization } from "better-auth/plugins";
import { prisma } from "@/lib/db";

// Better Auth — configuración del servidor (Fase 2 + Fase 6a + R1).
// - Adapter Prisma (cliente generado en `@/generated/prisma`, vía singleton).
// - Email + password habilitado, pero con el AUTO-REGISTRO público DESACTIVADO
//   (`disableSignUp: true`, R1): las cuentas las crea la empresa. El endpoint
//   `/sign-up/email` (y `auth.api.signUpEmail`) quedan bloqueados. Las altas se
//   hacen server-side con `auth.api.createUser` del plugin admin, que NO pasa
//   por el flujo de sign-up y por tanto NO está afectado por `disableSignUp`.
// - Plugin organization: estructura empresa + miembros + roles (red interna).
// - Plugin admin (Fase 6a): añade `role`/`banned`/`banReason`/`banExpires` al
//   User. Define los roles `user` (default) / `moderator` / `admin`.
// - Plugin nextCookies (R1): debe ir EL ÚLTIMO. Permite que las Server Actions
//   (p. ej. `demoLogin`) que llaman a `auth.api.signInEmail` persistan la cookie
//   de sesión en la respuesta. Sin él, el login programático no setea cookie.
//
// NOTA (R1): se ELIMINÓ el plugin `anonymous()` ("Entrar como invitado"). El
// acceso de cortesía a la demo se hace ahora con una cuenta REAL sembrada vía la
// Server Action `demoLogin` (gated por entorno), no con sesiones anónimas.
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
    // R1: sin auto-registro público. El login sigue funcionando; el sign-up
    // (endpoint + `auth.api.signUpEmail`) queda bloqueado. `auth.api.createUser`
    // del plugin admin NO se ve afectado (no pasa por el flujo de sign-up).
    disableSignUp: true,
  },
  plugins: [
    organization(),
    admin({
      // Rol por defecto al crear cuentas (menor privilegio).
      defaultRole: "user",
      // Qué roles obtienen los poderes nativos del plugin admin de Better Auth.
      // `moderator` NO los obtiene: su capacidad de moderar es de dominio.
      adminRoles: ["admin"],
    }),
    // SIEMPRE el último: propaga las cookies de sesión emitidas por las Server
    // Actions (demoLogin) a la respuesta de Next.
    nextCookies(),
  ],
});

/** Roles de la plataforma. `user` es el menor privilegio (default). */
export type AppRole = "user" | "moderator" | "admin";
