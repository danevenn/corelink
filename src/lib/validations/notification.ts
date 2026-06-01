import { z } from "zod";

// Esquemas zod del dominio "notificaciones" (Fase 7a).
// Validan el input de las queries/acciones antes de tocar la capa de datos.

// Los ids de Notification son cuid (id de dominio); los de usuario son nanoid
// (Better Auth) y se obtienen de la sesión, no del input del cliente.
const cuid = z.cuid("Identificador no válido.");

/** Paginación por cursor de la lista de notificaciones. */
export const notificationsPageSchema = z.object({
  cursor: cuid.optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export type NotificationsPageInput = z.infer<typeof notificationsPageSchema>;

/**
 * Input de `markNotificationsRead`. `ids` opcional: si se omite (o vacío) se
 * marcan TODAS las del usuario. Cuando se pasa, son cuids de Notification.
 */
export const markReadSchema = z.object({
  ids: z.array(cuid).max(200).optional(),
});

export type MarkReadInput = z.infer<typeof markReadSchema>;
