"use server";

// Acceso DEMO para portfolio (R1), gated por entorno.
//
// Sustituye al antiguo "Entrar como invitado" (plugin anonymous, eliminado). En
// lugar de una sesión anónima, inicia sesión como una cuenta DEMO REAL sembrada
// (un `user` normal), para que la experiencia sea la real del producto.
//
// Gate por entorno: SOLO funciona si `NEXT_PUBLIC_DEMO_MODE === "true"`. Usamos
// la variante `NEXT_PUBLIC_` para que el cliente también pueda decidir si pinta
// el botón; la action vuelve a comprobarlo en servidor (no confiamos en la UI).
// En el producto real (env off) la action devuelve error y no inicia sesión.
//
// Cuenta demo: `lucia.martin@corelink.demo` (rol `user`), con la contraseña
// común del seed. Es un usuario corriente (no staff): muestra la experiencia
// estándar. Sus credenciales NO son secretas (es una demo pública sembrada).

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/server/action-result";

const DEMO_EMAIL = "lucia.martin@corelink.demo";
const DEMO_PASSWORD = "corelink-demo-2026";

/** ¿Está activado el acceso demo por entorno? Server-only. */
export async function isDemoEnabled(): Promise<boolean> {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/**
 * Inicia sesión como la cuenta demo sembrada. La cookie de sesión la persiste el
 * plugin `nextCookies()` (último en `auth.ts`), que propaga el `set-cookie` de
 * `signInEmail` a la respuesta de la Server Action.
 *
 * Devuelve `{ ok:false }` si el entorno no tiene el demo activado.
 */
export async function demoLogin(): Promise<ActionResult<{ ok: true }>> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return {
      ok: false,
      error: { message: "El acceso de demostración no está disponible." },
    };
  }

  try {
    await auth.api.signInEmail({
      headers: await headers(),
      body: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
  } catch {
    return {
      ok: false,
      error: { message: "No se pudo iniciar la sesión de demostración." },
    };
  }

  return { ok: true, data: { ok: true } };
}
