import { expect, test } from "@playwright/test";
import { login } from "./_helpers/auth";
import { USERS } from "./_helpers/constants";

// REACCIONES — reaccionar a un post cambia el estado/contador (UI optimista) y
// persiste tras recargar.

test.describe("Reacciones", () => {
  test("reaccionar a un post persiste tras recargar", async ({ page }) => {
    await login(page, USERS.lucia.email);

    // Creamos un post propio y limpio (0 reacciones) para una aserción nítida.
    const text = `E2E reaccion ${Date.now()}`;
    const composer = page.getByRole("form", { name: "Crear publicación" });
    await composer.getByLabel("Comparte algo con tu equipo").fill(text);
    await composer.getByRole("button", { name: "Publicar" }).click();

    // Localizamos la card recién creada por su texto y, dentro, su barra de
    // reacciones. El artículo es el ancestro <article> del texto.
    const card = page.locator("article").filter({ hasText: text }).first();
    await expect(card).toBeVisible();

    // La primera reacción (sin contador todavía) → "Reaccionar con <label>".
    const likeButton = card
      .getByRole("button", { name: /^Reaccionar con/ })
      .first();
    await expect(likeButton).toHaveAttribute("aria-pressed", "false");

    await likeButton.click();

    // Optimista: queda "pressed" y su nombre accesible incluye el contador (1).
    await expect(likeButton).toHaveAttribute("aria-pressed", "true");
    await expect(likeButton).toHaveAccessibleName(/\(1\)/);
    // El resumen visible muestra "1 reacción" (singular). Usamos exact para no
    // chocar con el aria-live "1 reacción en total".
    await expect(card.getByText("1 reacción", { exact: true })).toBeVisible();

    // Persiste: recargamos y el estado sigue ahí (servidor = fuente de verdad).
    await page.reload();
    const cardAfter = page.locator("article").filter({ hasText: text }).first();
    await expect(
      cardAfter.getByRole("button", { name: /^Reaccionar con.*\(1\)/ }).first(),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      cardAfter.getByText("1 reacción", { exact: true }),
    ).toBeVisible();
  });
});
