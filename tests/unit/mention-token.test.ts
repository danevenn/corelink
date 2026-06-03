import { describe, expect, it } from "vitest";
import {
  buildMentionToken,
  hasMention,
  mentionsToPlainText,
  splitMentions,
} from "@/lib/mention-token";
import { parseMentions } from "@/server/mentions";

describe("buildMentionToken", () => {
  it("construye el token markdown-link @[name](id)", () => {
    expect(buildMentionToken("Ana Reyes", "usr_123")).toBe(
      "@[Ana Reyes](usr_123)",
    );
  });
});

describe("splitMentions", () => {
  it("trocea texto y menciones conservando el orden", () => {
    const input = "Hola @[Ana Reyes](usr_1), mira esto @[Bob](usr_2)!";
    expect(splitMentions(input)).toEqual([
      { type: "text", value: "Hola " },
      { type: "mention", displayName: "Ana Reyes", userId: "usr_1" },
      { type: "text", value: ", mira esto " },
      { type: "mention", displayName: "Bob", userId: "usr_2" },
      { type: "text", value: "!" },
    ]);
  });

  it("sin menciones → un único segmento de texto", () => {
    expect(splitMentions("texto plano")).toEqual([
      { type: "text", value: "texto plano" },
    ]);
  });

  it("string vacío → []", () => {
    expect(splitMentions("")).toEqual([]);
  });

  it("no engulle tokens contiguos (displayName lazy)", () => {
    const segs = splitMentions("@[A](u1)@[B](u2)");
    expect(segs).toEqual([
      { type: "mention", displayName: "A", userId: "u1" },
      { type: "mention", displayName: "B", userId: "u2" },
    ]);
  });
});

describe("hasMention", () => {
  it("detecta presencia y ausencia de tokens", () => {
    expect(hasMention("hola @[Ana](u1)")).toBe(true);
    expect(hasMention("hola @Ana")).toBe(false);
  });
});

describe("mentionsToPlainText", () => {
  it("sustituye cada token por @displayName", () => {
    expect(mentionsToPlainText("Hola @[Ana Reyes](usr_1)")).toBe(
      "Hola @Ana Reyes",
    );
  });

  it("devuelve el input intacto si no hay menciones", () => {
    expect(mentionsToPlainText("sin menciones")).toBe("sin menciones");
  });
});

// `parseMentions` (backend) extrae SOLO los userId, deduplicando por orden de
// primera aparición. Es el contrato puro que el resto del backend valida contra BD.
describe("parseMentions (backend, puro)", () => {
  it("extrae los userId de todos los tokens", () => {
    expect(parseMentions("@[Ana](u1) y @[Bob](u2)")).toEqual(["u1", "u2"]);
  });

  it("deduplica preservando el primer orden de aparición", () => {
    expect(parseMentions("@[Ana](u1) @[Bob](u2) @[Ana otra vez](u1)")).toEqual([
      "u1",
      "u2",
    ]);
  });

  it("sin tokens → []", () => {
    expect(parseMentions("hola mundo")).toEqual([]);
    expect(parseMentions("")).toEqual([]);
  });
});
