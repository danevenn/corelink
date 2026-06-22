// Contrato de resultado compartido para las Server Actions (server-only).
//
// Forma serializable común a todas las acciones: o bien `{ ok: true, data }`,
// o bien `{ ok: false, error }`. Antes se redefinía idéntica en cada módulo de
// acciones; centralizado aquí como única fuente de verdad.

export type ActionError = {
  message: string;
  /** Errores de validación por campo (zod flatten), si aplica. */
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ActionError };
