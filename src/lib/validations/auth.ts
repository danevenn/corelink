import { z } from "zod";

// Esquemas zod para los formularios de autenticación (Fase 2).
export const loginSchema = z.object({
  email: z.email("Introduce un correo válido."),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres."),
});

// R1: se eliminó `registerSchema` — el auto-registro público está desactivado.
// Las altas las hace la empresa (ver `createEmployeeSchema` en validations/admin).

// Cambio de contraseña forzado / voluntario (R1). Exigimos la contraseña actual
// (la temporal, en el caso del primer login) y una nueva razonablemente larga.
// `min(8)` queda alineado con `minPasswordLength` por defecto de Better Auth.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Introduce tu contraseña actual."),
    newPassword: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres.")
      .max(128, "La contraseña es demasiado larga."),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "La nueva contraseña debe ser distinta de la actual.",
    path: ["newPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
