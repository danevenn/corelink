import { z } from "zod";
import { ReactionType } from "@/generated/prisma/enums";

// Esquema zod del dominio "reacciones" (Fase 5a).
// Valida el input de `toggleReaction` antes de tocar la capa de datos.

// cuid() de Prisma para el id del post.
const cuid = z.cuid("Identificador no válido.");

// `z.enum` sobre los valores reales del enum generado por Prisma, así no se
// desincroniza con el schema: si cambian los tipos, este zod se actualiza solo.
export const reactionTypeSchema = z.enum(ReactionType);

export const toggleReactionSchema = z.object({
  postId: cuid,
  type: reactionTypeSchema,
});

export type ToggleReactionInput = z.infer<typeof toggleReactionSchema>;
