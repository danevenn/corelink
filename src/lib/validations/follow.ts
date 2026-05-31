import { z } from "zod";

// Esquema zod del dominio "follows" (Fase 5a).
// Valida el input de las acciones de seguir/dejar de seguir.

// OJO: los ids de User NO son cuids — provienen de Better Auth (nanoid de 32
// chars), a diferencia de los ids de dominio (Post, Reaction…). Por eso aquí
// validamos un id opaco no vacío, no `z.cuid()`.
const userId = z
  .string()
  .trim()
  .min(1, "Identificador no válido.")
  .max(64, "Identificador no válido.");

export const followSchema = z.object({
  targetUserId: userId,
});

export type FollowInput = z.infer<typeof followSchema>;
