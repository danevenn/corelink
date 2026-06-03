import { expect, test } from "@playwright/test";
import { login } from "./_helpers/auth";
import { USERS } from "./_helpers/constants";

// PERMISOS (UI, versión ligera) — el backend ya está cubierto en Capa 1. Aquí
// validamos que la UI role-aware no ofrece de más.

test.describe("Permisos de UI", () => {
  test("moderador: el panel no muestra 'Canales' y /admin/channels da notFound", async ({
    page,
  }) => {
    await login(page, USERS.marc.email);

    // Marc es staff: ve el enlace de gestión y entra al panel.
    await page.getByRole("link", { name: "Panel de gestión" }).click();
    await page.waitForURL(/\/admin\/users/);

    const tabs = page.getByRole("navigation", {
      name: "Secciones de gestión",
    });
    await expect(tabs.getByRole("link", { name: "Usuarios" })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Moderación" })).toBeVisible();
    // "Canales" es solo-admin: no debe existir para el moderador.
    await expect(tabs.getByRole("link", { name: "Canales" })).toHaveCount(0);

    // Forzar la URL directa de canales → notFound (404). El gate server-side
    // devuelve notFound; el gestor de canales NO se renderiza.
    await page.goto("/admin/channels");
    await expect(
      page.getByRole("heading", { name: "Secciones de gestión" }),
    ).toHaveCount(0);
    // La página 404 de Next muestra el código 404.
    await expect(page.getByText("404")).toBeVisible();
  });

  test("usuario normal: no hay enlace de gestión", async ({ page }) => {
    await login(page, USERS.lucia.email);

    await expect(
      page.getByRole("link", { name: "Panel de gestión" }),
    ).toHaveCount(0);
  });
});
