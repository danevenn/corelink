// Constantes compartidas por los specs E2E: credenciales demo sembradas y la
// contraseña común. Coinciden con `prisma/seed.ts` (la fuente de verdad). Estas
// credenciales NO son secretas: son datos de una demo pública sembrada.

export const DEMO_PASSWORD = "corelink-demo-2026";

export const USERS = {
  /** Usuario normal (rol `user`). */
  lucia: { email: "lucia.martin@corelink.demo", name: "Lucía Martín" },
  /** Admin (CTO). */
  ana: { email: "ana.reyes@corelink.demo", name: "Ana Reyes" },
  /** Moderador (Operations Manager). */
  marc: { email: "marc.soler@corelink.demo", name: "Marc Soler" },
  /** Usuario normal. */
  diego: { email: "diego.ferrer@corelink.demo", name: "Diego Ferrer" },
  /** Usuario normal. */
  noa: { email: "noa.vidal@corelink.demo", name: "Noa Vidal" },
} as const;

/** Genera un email único por ejecución (alta de empleado sin colisiones). */
export function uniqueEmail(prefix = "empleado"): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}.${stamp}${rand}@corelink.demo`;
}
