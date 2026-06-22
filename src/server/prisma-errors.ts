// Helpers de errores de Prisma (server-only).
//
// `isUniqueViolation` se repetía idéntico en varias acciones; centralizado aquí.

/** `true` si el error es una violación de unicidad de Prisma (código P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
