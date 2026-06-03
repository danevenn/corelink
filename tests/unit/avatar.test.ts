import { describe, expect, it } from "vitest";
import { avatarColor, initials } from "@/lib/feed-ui";

// Lógica pura del avatar de fallback (ya extraída a src/lib/feed-ui.ts y
// consumida por components/feed/avatar.tsx).
describe("initials", () => {
  it("toma la inicial del nombre y del apellido", () => {
    expect(initials("Ana Reyes")).toBe("AR");
  });

  it("nombre de una sola palabra → dos primeras letras en mayúscula", () => {
    expect(initials("lucia")).toBe("LU");
  });

  it("nombre con varias palabras usa primera y última", () => {
    expect(initials("Juan Carlos Pérez")).toBe("JP");
  });

  it("recorta espacios sobrantes", () => {
    expect(initials("  Marc   Soler  ")).toBe("MS");
  });

  it("cadena vacía → '?'", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});

describe("avatarColor", () => {
  it("es determinista: mismo seed → misma clase", () => {
    expect(avatarColor("usr_1")).toBe(avatarColor("usr_1"));
  });

  it("devuelve una clase de la paleta (bg-*-700/800)", () => {
    expect(avatarColor("cualquier-seed")).toMatch(/^bg-[a-z]+-(700|800)$/);
  });

  it("seed vacío sigue devolviendo una clase válida (fallback)", () => {
    expect(avatarColor("")).toMatch(/^bg-[a-z]+-(700|800)$/);
  });
});
