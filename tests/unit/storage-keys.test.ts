import { describe, expect, it } from "vitest";
import {
  newStorageKey,
  safeExtension,
  sanitizeKey,
} from "@/server/storage/keys";

describe("safeExtension", () => {
  it("deriva la extensión del MIME validado (preferente)", () => {
    expect(safeExtension("image/png", "foto.bmp")).toBe("png");
    expect(safeExtension("image/jpeg", "x")).toBe("jpg");
    expect(safeExtension("application/pdf", "doc")).toBe("pdf");
  });

  it("cae al nombre del archivo si el MIME no está mapeado", () => {
    expect(safeExtension("application/octet-stream", "archivo.WEBP")).toBe(
      "webp",
    );
  });

  it("sanea la extensión a [a-z0-9] y la acota a 8 chars", () => {
    expect(safeExtension("x/y", "f.ph p!")).toBe("php");
    expect(safeExtension("x/y", "f.abcdefghijk")).toBe("abcdefgh");
  });

  it("sin extensión determinable → ''", () => {
    expect(safeExtension("x/y", "sinpunto")).toBe("");
    expect(safeExtension("x/y", "termina.")).toBe("");
  });
});

describe("newStorageKey", () => {
  it("genera <uuid>.<ext> sin separadores de ruta", () => {
    const key = newStorageKey("image/png", "foto.png");
    expect(key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(key).not.toContain("/");
  });

  it("omite el punto cuando no hay extensión segura", () => {
    const key = newStorageKey("x/y", "sinext");
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("sanitizeKey (anti path-traversal)", () => {
  it("acepta nombres planos válidos", () => {
    expect(sanitizeKey("abc-123_def.png")).toBe("abc-123_def.png");
  });

  it("rechaza separadores de ruta y recorrido", () => {
    expect(sanitizeKey("../etc/passwd")).toBeNull();
    expect(sanitizeKey("a/b")).toBeNull();
    expect(sanitizeKey("a\\b")).toBeNull();
    expect(sanitizeKey("..")).toBeNull();
  });

  it("rechaza caracteres no permitidos", () => {
    expect(sanitizeKey("archivo con espacios.png")).toBeNull();
    expect(sanitizeKey("a$b.png")).toBeNull();
  });

  it("rechaza vacío y claves demasiado largas", () => {
    expect(sanitizeKey("")).toBeNull();
    expect(sanitizeKey("a".repeat(201))).toBeNull();
  });
});
