// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { insertAtCursor } from "@/lib/insert-at-cursor";

// Única función de UI pura que testeamos; necesita HTMLTextAreaElement (jsdom).
describe("insertAtCursor", () => {
  it("sin elemento, añade al final", () => {
    const r = insertAtCursor(null, "hola", "!");
    expect(r).toEqual({ value: "hola!", caret: 5 });
  });

  it("inserta en la posición del cursor (reemplazando la selección)", () => {
    const el = document.createElement("textarea");
    el.value = "hola mundo";
    el.selectionStart = 5; // antes de "mundo"
    el.selectionEnd = 5;
    const r = insertAtCursor(el, "hola mundo", "bonito ");
    expect(r.value).toBe("hola bonito mundo");
    expect(r.caret).toBe(12); // 5 + "bonito ".length
  });

  it("reemplaza el rango seleccionado", () => {
    const el = document.createElement("textarea");
    el.value = "hola mundo";
    el.selectionStart = 5;
    el.selectionEnd = 10; // selecciona "mundo"
    const r = insertAtCursor(el, "hola mundo", "tierra");
    expect(r.value).toBe("hola tierra");
    expect(r.caret).toBe(11);
  });
});
