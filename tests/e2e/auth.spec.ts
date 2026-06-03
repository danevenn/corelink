import { expect, test } from "@playwright/test";
import { login, logout } from "./_helpers/auth";
import { USERS } from "./_helpers/constants";

// AUTH — login, logout y protección de rutas.

test.describe("Autenticación", () => {
  test("login con usuario demo aterriza en /feed y logout vuelve a /login", async ({
    page,
  }) => {
    await login(page, USERS.lucia.email);

    // Aterrizamos en el feed: la cabecera del feed y el composer están presentes.
    await expect(page).toHaveURL(/\/feed/);
    await expect(
      page.getByRole("heading", { name: "Feed del equipo" }),
    ).toBeVisible();
    await expect(
      page.getByRole("form", { name: "Crear publicación" }),
    ).toBeVisible();

    // Logout desde el menú de usuario.
    await logout(page, USERS.lucia.name);
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Bienvenido de nuevo" }),
    ).toBeVisible();
  });

  test("una ruta protegida sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/feed");
    // Sin sesión, la zona protegida redirige a /login (defensa en profundidad:
    // middleware optimista + gate del layout server).
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Bienvenido de nuevo" }),
    ).toBeVisible();
  });

  test("credenciales inválidas muestran error y no navegan", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill(USERS.lucia.email);
    await page.getByLabel("Contraseña").fill("contraseña-incorrecta");
    await page.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
