import { expect, test } from "@playwright/test";
import { login, logout } from "./_helpers/auth";
import { USERS, uniqueEmail } from "./_helpers/constants";

// ONBOARDING (flujo estrella) — alta de empleado por un admin → primer login del
// empleado → cambio de contraseña FORZADO → feed.

test.describe("Onboarding de empleado", () => {
  test("admin da de alta un empleado que cambia su contraseña en el primer acceso", async ({
    page,
  }) => {
    const email = uniqueEmail("alta-e2e");

    // 1) Login como admin (Ana) y entra al panel de Gestión.
    await login(page, USERS.ana.email);
    await page.getByRole("link", { name: "Panel de gestión" }).click();
    await page.waitForURL(/\/admin\/users/);
    await expect(page.getByRole("heading", { name: "Gestión" })).toBeVisible();

    // 2) Abre el diálogo de alta y rellena el formulario (contraseña auto).
    await page.getByRole("button", { name: "Dar de alta empleado" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre completo").fill("Empleado E2E");
    await dialog.getByLabel("Correo electrónico").fill(email);
    await dialog.getByRole("button", { name: "Crear empleado" }).click();

    // 3) Captura la contraseña temporal mostrada UNA vez (elemento <code>).
    await expect(
      dialog.getByText("Empleado creado", { exact: false }),
    ).toBeVisible();
    const tempPassword = (await dialog.locator("code").innerText()).trim();
    expect(tempPassword.length).toBeGreaterThan(0);

    await dialog.getByRole("button", { name: "Hecho" }).click();

    // 4) Logout del admin.
    await logout(page, USERS.ana.name);

    // 5) Primer login del empleado → el gate fuerza el cambio de contraseña.
    await login(page, email, tempPassword, /\/change-password/);
    await expect(
      page.getByRole("heading", { name: "Cambia tu contraseña" }),
    ).toBeVisible();

    // 6) Cambia la contraseña → aterriza en /feed.
    const newPassword = "Empleado-E2E-2026!";
    await page.getByLabel("Contraseña actual").fill(tempPassword);
    await page
      .getByLabel("Nueva contraseña", { exact: true })
      .fill(newPassword);
    await page.getByLabel("Repite la nueva contraseña").fill(newPassword);
    await page.getByRole("button", { name: "Guardar contraseña" }).click();

    await page.waitForURL(/\/feed/);
    await expect(
      page.getByRole("heading", { name: "Feed del equipo" }),
    ).toBeVisible();
  });
});
