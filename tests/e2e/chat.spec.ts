import { expect, test } from "@playwright/test";
import { login } from "./_helpers/auth";
import { USERS } from "./_helpers/constants";

// CHAT — abrir una conversación y enviar un mensaje → aparece en el hilo.

test.describe("Chat", () => {
  test("enviar un mensaje en una conversación lo muestra en el hilo", async ({
    page,
  }) => {
    await login(page, USERS.lucia.email);

    await page.goto("/messages");

    // Lucía tiene un DM sembrado con Diego en la lista de conversaciones.
    const conversations = page.getByRole("list", { name: "Conversaciones" });
    await expect(conversations).toBeVisible();
    await conversations.getByRole("link").first().click();
    await page.waitForURL(/\/messages\/.+/);

    // Enviamos un mensaje único por la UI (Enter envía; usamos el botón).
    const text = `E2E chat ${Date.now()}`;
    const composer = page.getByLabel("Escribe un mensaje");
    await composer.fill(text);
    await page.getByRole("button", { name: "Enviar mensaje" }).click();

    // El mensaje aparece en el log del hilo (optimista → confirmado).
    const log = page.getByRole("log", { name: "Historial de mensajes" });
    await expect(log.getByText(text, { exact: true })).toBeVisible();
  });

  test("crear un DM nuevo desde 'Nueva conversación' y enviar un mensaje", async ({
    page,
  }) => {
    await login(page, USERS.lucia.email);
    await page.goto("/messages");

    // Abre el selector de nueva conversación y busca a Noa (no tiene DM con
    // Lucía en el seed; getOrCreateDirect crea/reutiliza la conversación).
    await page.getByRole("button", { name: "Nueva conversación" }).click();
    const dialog = page.getByRole("dialog", { name: "Nueva conversación" });
    await dialog.getByLabel("Buscar personas").fill("Noa");
    await dialog
      .getByRole("button", { name: /Noa Vidal/ })
      .first()
      .click();

    await page.waitForURL(/\/messages\/.+/);

    const text = `E2E nuevo DM ${Date.now()}`;
    await page.getByLabel("Escribe un mensaje").fill(text);
    await page.getByRole("button", { name: "Enviar mensaje" }).click();

    const log = page.getByRole("log", { name: "Historial de mensajes" });
    await expect(log.getByText(text, { exact: true })).toBeVisible();
  });
});
