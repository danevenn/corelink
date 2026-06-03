import { describe, expect, it } from "vitest";
import {
  hasEmoji,
  openmojiHexcode,
  openmojiHexcodeNoVariation,
  splitEmoji,
} from "@/lib/emoji";

// La regla delicada de OpenMoji sobre FE0F (VS16):
//   - emoji suelto con FE0F → se ELIMINA el FE0F,
//   - secuencia ZWJ (200D) o keycap (20E3) → se CONSERVA el FE0F.
describe("openmojiHexcode", () => {
  it("elimina FE0F en un emoji suelto con variation selector (❤️ → 2764)", () => {
    expect(openmojiHexcode("❤️")).toBe("2764");
  });

  it("emoji simple sin FE0F se mantiene (✅ → 2705)", () => {
    expect(openmojiHexcode("✅")).toBe("2705");
  });

  it("conserva FE0F dentro de una secuencia ZWJ (❤️‍🔥)", () => {
    // corazón en llamas: 2764 FE0F 200D 1F525 → el FE0F se conserva.
    expect(openmojiHexcode("❤️‍🔥")).toBe("2764-FE0F-200D-1F525");
  });

  it("conserva FE0F en un keycap (#️⃣ → 23-FE0F-20E3)", () => {
    // La función NO rellena con ceros a 4 dígitos: usa el hex tal cual del
    // codepoint (# = U+0023 → "23"). Lo relevante es que el FE0F se conserva.
    expect(openmojiHexcode("#️⃣")).toBe("23-FE0F-20E3");
  });

  it("emoji con skin tone modifier conserva ambos codepoints (👍🏽)", () => {
    // pulgar arriba + tono de piel medio: 1F44D 1F3FD (sin FE0F que quitar).
    expect(openmojiHexcode("👍🏽")).toBe("1F44D-1F3FD");
  });

  it("bandera (regional indicators) une ambos codepoints (🇪🇸)", () => {
    expect(openmojiHexcode("🇪🇸")).toBe("1F1EA-1F1F8");
  });
});

describe("openmojiHexcodeNoVariation", () => {
  it("ofrece la variante CON FE0F como alternativa para un emoji suelto", () => {
    expect(openmojiHexcodeNoVariation("❤️")).toBe("2764-FE0F");
  });

  it("devuelve null cuando no hay alternativa distinta (✅ sin FE0F)", () => {
    expect(openmojiHexcodeNoVariation("✅")).toBeNull();
  });
});

describe("splitEmoji / hasEmoji", () => {
  it("trocea texto y emoji en segmentos ordenados", () => {
    expect(splitEmoji("Hola ✅ mundo")).toEqual([
      { type: "text", value: "Hola " },
      { type: "emoji", value: "✅" },
      { type: "text", value: " mundo" },
    ]);
  });

  it("string vacío → []", () => {
    expect(splitEmoji("")).toEqual([]);
  });

  it("hasEmoji detecta presencia de emoji y su ausencia", () => {
    expect(hasEmoji("solo texto")).toBe(false);
    expect(hasEmoji("con ✅")).toBe(true);
  });
});
