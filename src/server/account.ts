"use server";

// Server Actions de la CUENTA del usuario actual (R1).
//
// Por ahora: cambio de contraseña propio (incluye el caso de cambio FORZADO en
// el primer login de las cuentas dadas de alta por la empresa).
//
// Contrato consistente con el resto del servidor (`post-actions.ts`):
// `ActionResult<T>` serializable — nunca se lanza para el flujo normal.

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { changePasswordSchema } from "@/lib/validations/auth";
import { getViewer } from "@/server/authz";
import type { ActionResult } from "@/server/post-actions";

/**
 * Cambia la contraseña del usuario ACTUAL.
 *
 * Exige `currentPassword` (la temporal en el primer login) y `newPassword`.
 * Usa `auth.api.changePassword` (Better Auth) — que reverifica `currentPassword`
 * contra el hash almacenado y revoca el resto de sesiones — y, si tiene éxito,
 * pone `mustChangePassword=false` para liberar el gate de la zona protegida.
 *
 * Re-verifica la sesión en servidor (defensa en profundidad) antes de tocar
 * nada. NUNCA registra contraseñas.
 */
export async function changeOwnPassword(
  input: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const viewer = await getViewer();
  if (!viewer) {
    return { ok: false, error: { message: "Debes iniciar sesión." } };
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        message: "Datos no válidos.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
    };
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        // Cierra el resto de sesiones tras un cambio de contraseña.
        revokeOtherSessions: true,
      },
    });
  } catch {
    // Causa típica: la contraseña actual no coincide. Mensaje genérico (sin
    // filtrar si el fallo es por la actual o por la nueva).
    return {
      ok: false,
      error: { message: "No se pudo cambiar la contraseña. Revisa los datos." },
    };
  }

  // Libera el gate de cambio forzado. Idempotente.
  await prisma.user.update({
    where: { id: viewer.id },
    data: { mustChangePassword: false },
  });

  return { ok: true, data: { userId: viewer.id } };
}
