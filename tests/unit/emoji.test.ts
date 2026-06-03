import { describe, expect, it } from "vitest";
import {
  emojiAssetName,
  emojiAssetNameFull,
  hasEmoji,
  splitEmoji,
} from "@/lib/emoji";

// La regla delicada de Twemoji sobre FE0F (VS16), verificada contra los SVG
// reales de @discordapp/twemoji v16:
//   - si la secuencia contiene un ZWJ (200D) → se CONSERVA el FE0F,
//   - si NO contiene ZWJ (emoji suelto O keycap) → se ELIMINA todo FE0F.
// Hexcodes en MINÚSCULAS unidos por "-".
describe("emojiAssetName (convención Twemoji)", () => {
  it("elimina FE0F en un emoji suelto con variation selector (❤️ → 2764)", () => {
    expect(emojiAssetName("❤️")).toBe("2764");
  });

  it("elimina FE0F en ✌️ (sin ZWJ → 270c)", () => {
    expect(emojiAssetName("✌️")).toBe("270c");
  });

  it("emoji simple sin FE0F se mantiene en minúscula (👍 → 1f44d)", () => {
    expect(emojiAssetName("👍")).toBe("1f44d");
  });

  it("conserva FE0F dentro de una secuencia ZWJ (❤️‍🔥 → 2764-fe0f-200d-1f525)", () => {
    expect(emojiAssetName("❤️‍🔥")).toBe("2764-fe0f-200d-1f525");
  });

  it("secuencia ZWJ sin FE0F (👨‍💻 → 1f468-200d-1f4bb)", () => {
    expect(emojiAssetName("👨‍💻")).toBe("1f468-200d-1f4bb");
  });

  it("familia ZWJ larga (👨‍👩‍👧‍👦)", () => {
    expect(emojiAssetName("👨‍👩‍👧‍👦")).toBe(
      "1f468-200d-1f469-200d-1f467-200d-1f466",
    );
  });

  it("keycap SIN ZWJ → elimina FE0F (#️⃣ → 23-20e3)", () => {
    // Punto clave que distingue a Twemoji de OpenMoji: el keycap no lleva ZWJ,
    // así que su FE0F se ELIMINA (en OpenMoji se conservaba).
    expect(emojiAssetName("#️⃣")).toBe("23-20e3");
  });

  it("emoji con skin tone modifier conserva ambos codepoints (👍🏽 → 1f44d-1f3fd)", () => {
    expect(emojiAssetName("👍🏽")).toBe("1f44d-1f3fd");
  });

  it("bandera (regional indicators) une ambos codepoints (🇪🇸 → 1f1ea-1f1f8)", () => {
    expect(emojiAssetName("🇪🇸")).toBe("1f1ea-1f1f8");
  });
});

describe("emojiAssetNameFull", () => {
  it("ofrece la variante CON todos los codepoints como alternativa (❤️ → 2764-fe0f)", () => {
    expect(emojiAssetNameFull("❤️")).toBe("2764-fe0f");
  });

  it("devuelve null cuando no hay alternativa distinta (👍 sin FE0F)", () => {
    expect(emojiAssetNameFull("👍")).toBeNull();
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
