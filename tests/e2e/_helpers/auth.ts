// Helper de login para los specs E2E. Hace el login REAL por la página /login
// (email + password, Better Auth), igual que un usuario. No hay registro: las
// credenciales provienen del seed.

import { expect, type Page } from "@playwright/test";
import { DEMO_PASSWORD } from "./constants";

/**
 * Inicia sesión por la UI con las credenciales dadas y espera a aterrizar en la
 * ruta destino (por defecto `/feed`). Usa selectores accesibles (labels).
 */
export async function login(
  page: Page,
  email: string,
  password: string = DEMO_PASSWORD,
  expectPath: string | RegExp = "/feed",
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page.waitForURL(expectPath);
}

/** Cierra sesión desde el menú de usuario de la cabecera. */
export async function logout(page: Page, displayName: string): Promise<void> {
  await page.getByRole("button", { name: `Cuenta de ${displayName}` }).click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
}
