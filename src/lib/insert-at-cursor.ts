// Inserta texto en la posición del cursor de un <textarea> controlado.
//
// Devuelve el nuevo valor completo; el llamador actualiza su estado React. Tras
// el render, recoloca el cursor justo después del texto insertado y mantiene el
// foco (necesario para los pickers de emoji: insertar sin perder el sitio).

export type InsertResult = {
  /** Nuevo valor completo del textarea. */
  value: string;
  /** Posición del cursor tras la inserción (selectionStart/End). */
  caret: number;
};

/** Calcula el valor resultante de insertar `insert` en la selección actual. */
export function insertAtCursor(
  el: HTMLTextAreaElement | null,
  current: string,
  insert: string,
): InsertResult {
  // Sin elemento (o sin foco previo): añade al final.
  if (!el) {
    return { value: current + insert, caret: current.length + insert.length };
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const value = current.slice(0, start) + insert + current.slice(end);
  return { value, caret: start + insert.length };
}

/** Recoloca el cursor y devuelve el foco al textarea tras actualizar el valor. */
export function restoreCaret(el: HTMLTextAreaElement | null, caret: number) {
  if (!el) return;
  // En el siguiente frame el textarea ya tiene el nuevo valor renderizado.
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(caret, caret);
  });
}
