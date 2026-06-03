import { describe, expect, it } from "vitest";
import { canModerate, isAdmin } from "@/server/authz";

// Funciones PURAS de decisión de rol (sin sesión ni BD). El resto de authz
// (getViewer/requireModerator…) se ejerce en los tests de integración.
describe("canModerate", () => {
  it("admin y moderator son staff", () => {
    expect(canModerate("admin")).toBe(true);
    expect(canModerate("moderator")).toBe(true);
  });

  it("user no es staff", () => {
    expect(canModerate("user")).toBe(false);
  });
});

describe("isAdmin", () => {
  it("solo admin", () => {
    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("moderator")).toBe(false);
    expect(isAdmin("user")).toBe(false);
  });
});
