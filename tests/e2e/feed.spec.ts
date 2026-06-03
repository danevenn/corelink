import { expect, test } from "@playwright/test";
import { login } from "./_helpers/auth";
import { USERS } from "./_helpers/constants";

// FEED — crear un post (texto) y verlo aparecer en el feed.

test.describe("Feed", () => {
  test("crear un post de texto lo muestra en el feed", async ({ page }) => {
    await login(page, USERS.lucia.email);

    // Contenido único por ejecución (la resiembra del globalSetup no lo trae).
    const text = `E2E post ${Date.now()}`;

    const composer = page.getByRole("form", { name: "Crear publicación" });
    await composer.getByLabel("Comparte algo con tu equipo").fill(text);
    await composer.getByRole("button", { name: "Publicar" }).click();

    // Tras publicar (router.refresh), el post aparece en el feed. El feed es un
    // listado de <article>; auto-wait al texto recién creado.
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  });

  test("insertar un emoji desde el picker lo añade al post", async ({
    page,
  }) => {
    await login(page, USERS.lucia.email);

    const text = `E2E emoji ${Date.now()} `;
    const composer = page.getByRole("form", { name: "Crear publicación" });
    const textarea = composer.getByLabel("Comparte algo con tu equipo");
    await textarea.fill(text);

    // Abre el picker de emojis (botón "Insertar emoji"). El pool se carga bajo
    // demanda (fetch del JSON estático al abrir), así que esperamos a que
    // aparezca la primera celda de emoji (cada una es un <button[data-emoji-cell]>
    // con aria-label = nombre del emoji).
    await composer.getByRole("button", { name: "Insertar emoji" }).click();
    const picker = page.getByLabel("Selector de emojis");
    const firstEmoji = picker.locator("button[data-emoji-cell]").first();
    await expect(firstEmoji).toBeVisible();
    await firstEmoji.click();

    // El picker no se cierra al elegir (permite encadenar). El textarea debe
    // contener ahora más caracteres que el texto base (se insertó el emoji).
    // Cerramos el picker con Escape antes de publicar.
    await page.keyboard.press("Escape");
    await expect(textarea).not.toHaveValue(text);
    await expect(textarea).toHaveValue(new RegExp(`^${escapeRegExp(text)}`));

    await composer.getByRole("button", { name: "Publicar" }).click();
    // El post (con su prefijo único) aparece en el feed.
    await expect(
      page.getByText(text.trim(), { exact: false }).first(),
    ).toBeVisible();
  });
});

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
