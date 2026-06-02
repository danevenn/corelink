import { z } from "zod";

// Esquemas zod del dominio "admin" (Fase 10a).
// Validan TODO lo que entra a las Server Actions de administración antes de
// tocar la capa de datos o la API del plugin admin de Better Auth.
//
// Autorización (rol) NO se valida aquí: la decide cada action con
// `requireAdmin()`/`requireModerator()` de `src/server/authz.ts`. Aquí solo
// validamos la FORMA de los datos.

// ── Roles de plataforma ──────────────────────────────────────────────────────

/** Enum cerrado de roles de plataforma, alineado con `AppRole` de auth.ts. */
export const appRoleSchema = z.enum(["user", "moderator", "admin"], {
  message: "Rol no válido.",
});

// ── Identificadores ──────────────────────────────────────────────────────────

// El id de User es un nanoid opaco (NO cuid). No imponemos formato cuid; solo
// que sea un string no vacío y acotado para evitar payloads absurdos.
const userId = z
  .string()
  .trim()
  .min(1, "Identificador de usuario requerido.")
  .max(64, "Identificador de usuario no válido.");

// Channel usa cuid (Prisma @default(cuid())).
const channelId = z.cuid("Identificador de canal no válido.");

// ── Gestión de usuarios / roles ──────────────────────────────────────────────

export const setUserRoleSchema = z.object({
  userId,
  role: appRoleSchema,
});

const BAN_REASON_MAX = 500;
const EXPIRES_DAYS_MAX = 3650; // ~10 años: tope defensivo.

export const banUserSchema = z.object({
  userId,
  reason: z.string().trim().max(BAN_REASON_MAX).optional(),
  // Días hasta que expira el baneo. Ausente = baneo permanente.
  expiresInDays: z.number().int().positive().max(EXPIRES_DAYS_MAX).optional(),
});

export const userIdSchema = z.object({ userId });

// ── Alta de empleados (R1) ───────────────────────────────────────────────────
//
// Rol asignable en el alta: SOLO `user` o `moderator`. Crear administradores NO
// se hace por esta vía (un moderador no debe poder crear admins, y la promoción
// a admin tiene su propio camino: `setUserRole`, solo-admin). La regla de "quién
// puede asignar qué" se re-aplica en la action `createEmployee` (defensa en
// profundidad); aquí solo cerramos el conjunto de roles válidos de FORMA.
export const employeeRoleSchema = z.enum(["user", "moderator"], {
  message: "Rol de empleado no válido.",
});

const EMPLOYEE_NAME_MIN = 2;
const EMPLOYEE_NAME_MAX = 80;
const TEMP_PASSWORD_MIN = 12;
const TEMP_PASSWORD_MAX = 128;

export const createEmployeeSchema = z.object({
  email: z.email("Introduce un correo válido."),
  name: z
    .string()
    .trim()
    .min(EMPLOYEE_NAME_MIN, "El nombre debe tener al menos 2 caracteres.")
    .max(EMPLOYEE_NAME_MAX, "El nombre es demasiado largo."),
  // Por defecto, menor privilegio.
  role: employeeRoleSchema.default("user"),
  // Departamento opcional: es un Channel de tipo DEPARTMENT (cuid).
  departmentId: channelId.optional(),
  // Contraseña temporal opcional: si no se pasa, la action genera una segura.
  temporaryPassword: z
    .string()
    .min(TEMP_PASSWORD_MIN, "La contraseña temporal es demasiado corta.")
    .max(TEMP_PASSWORD_MAX, "La contraseña temporal es demasiado larga.")
    .optional(),
});

export const listUsersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  // Paginación por offset (la API del plugin admin usa limit/offset).
  page: z.number().int().min(1).max(10000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// ── Gestión de canales ───────────────────────────────────────────────────────

const CHANNEL_NAME_MIN = 2;
const CHANNEL_NAME_MAX = 80;
const CHANNEL_DESC_MAX = 500;
const SLUG_MAX = 60;

// slug: minúsculas, números y guiones; sin guiones al inicio/fin ni dobles.
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const channelName = z
  .string()
  .trim()
  .min(CHANNEL_NAME_MIN, "El nombre es demasiado corto.")
  .max(
    CHANNEL_NAME_MAX,
    `El nombre no puede superar ${CHANNEL_NAME_MAX} caracteres.`,
  );

const channelSlug = z
  .string()
  .trim()
  .min(2, "El slug es demasiado corto.")
  .max(SLUG_MAX, `El slug no puede superar ${SLUG_MAX} caracteres.`)
  .regex(slugRegex, "Slug no válido: usa minúsculas, números y guiones.");

const channelDescription = z
  .string()
  .trim()
  .max(
    CHANNEL_DESC_MAX,
    `La descripción no puede superar ${CHANNEL_DESC_MAX} caracteres.`,
  );

export const channelTypeSchema = z.enum(["DEPARTMENT", "TOPIC"], {
  message: "Tipo de canal no válido.",
});

export const createChannelSchema = z.object({
  name: channelName,
  slug: channelSlug,
  // Descripción opcional; cadena vacía se normaliza a null en la action.
  description: channelDescription.optional(),
  type: channelTypeSchema.default("TOPIC"),
});

// Editar: todos opcionales (parcial), pero slug NO es editable (es la clave
// estable de las URLs/rutas del canal; cambiarlo rompería enlaces). Se omite a
// propósito del update.
export const updateChannelSchema = z.object({
  id: channelId,
  name: channelName.optional(),
  description: channelDescription.nullable().optional(),
  type: channelTypeSchema.optional(),
});

export const channelIdSchema = z.object({ id: channelId });

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;
export type BanUserInput = z.infer<typeof banUserSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
