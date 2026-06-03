import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createEmployee } from "@/server/admin/users";
import { createUser } from "./_helpers/fixtures";
import { runAs } from "./_helpers/session";
import "./_helpers/setup";

// `createEmployee` ejerce de verdad `auth.api.createUser` del plugin admin de
// Better Auth contra la BD de test (sin headers: llamada server-side de
// confianza, ya autorizada por requireModerator). El gate de rol lo controla el
// espía de sesión (runAs).
describe("createEmployee", () => {
  it("un admin da de alta un empleado con rol user y mustChangePassword=true", async () => {
    const admin = await createUser({ role: "admin" });
    const email = `empleado-${Date.now()}@corelink.test`;

    const res = await runAs({ id: admin.id, role: "admin" }, () =>
      createEmployee({ email, name: "Nuevo Empleado", role: "user" }),
    );

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.temporaryPassword).toBeTruthy();

    const created = await prisma.user.findUnique({
      where: { id: res.data.userId },
      include: { profile: true },
    });
    expect(created?.email).toBe(email);
    expect(created?.role).toBe("user");
    expect(created?.mustChangePassword).toBe(true);
    expect(created?.profile?.displayName).toBe("Nuevo Empleado");
  });

  it("un moderador puede dar de alta empleados con rol user", async () => {
    const mod = await createUser({ role: "moderator" });
    const email = `emp-mod-${Date.now()}@corelink.test`;

    const res = await runAs({ id: mod.id, role: "moderator" }, () =>
      createEmployee({ email, name: "Empleado Mod", role: "user" }),
    );
    expect(res.ok).toBe(true);
  });

  it("un moderador NO puede crear empleados con rol moderator (anti-escalada)", async () => {
    const mod = await createUser({ role: "moderator" });
    const email = `emp-escalada-${Date.now()}@corelink.test`;

    const res = await runAs({ id: mod.id, role: "moderator" }, () =>
      createEmployee({ email, name: "Intento Escalada", role: "moderator" }),
    );

    expect(res.ok).toBe(false);
    // No debe haberse creado ningún usuario con ese email.
    expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
  });

  it("un user normal (no staff) es rechazado", async () => {
    const user = await createUser({ role: "user" });
    const res = await runAs({ id: user.id, role: "user" }, () =>
      createEmployee({
        email: `x-${Date.now()}@corelink.test`,
        name: "No Autorizado",
        role: "user",
      }),
    );
    expect(res.ok).toBe(false);
  });
});
