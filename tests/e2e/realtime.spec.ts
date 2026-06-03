import { type BrowserContext, expect, test } from "@playwright/test";
import { login } from "./_helpers/auth";
import { DEMO_PASSWORD, USERS } from "./_helpers/constants";

// TIEMPO REAL (showcase, DOS contextos) — SSE (Postgres LISTEN/NOTIFY).
//
// Contexto A: Lucía en /feed, mirando la campana de notificaciones.
// Contexto B: Diego reacciona a un post de Lucía.
// Resultado esperado: la campana de Lucía sube EN VIVO, sin recargar.
//
// Robustez: dos contextos = dos sesiones independientes. Esperamos al cambio del
// badge con auto-wait y timeout amplio (el evento viaja por la conexión SSE).

test.describe("Tiempo real (dos contextos)", () => {
  test("una reacción de otro usuario sube la campana de Lucía en vivo", async ({
    browser,
  }) => {
    let ctxA: BrowserContext | undefined;
    let ctxB: BrowserContext | undefined;
    try {
      // ── Contexto A: Lucía ───────────────────────────────────────────────────
      ctxA = await browser.newContext();
      const pageA = await ctxA.newPage();
      await login(pageA, USERS.lucia.email);

      // Lucía publica un post fresco (sin reacciones) para una señal nítida.
      const text = `E2E realtime ${Date.now()}`;
      const composerA = pageA.getByRole("form", { name: "Crear publicación" });
      await composerA.getByLabel("Comparte algo con tu equipo").fill(text);
      await composerA.getByRole("button", { name: "Publicar" }).click();
      await expect(pageA.getByText(text, { exact: true })).toBeVisible();

      // La campana de Lucía: estado inicial (sin novedades de este post).
      const bell = pageA.getByRole("button", { name: /^Notificaciones/ });
      await expect(bell).toBeVisible();
      // Captura el nº inicial de no-leídas desde el aria-label.
      const before = await unreadFromLabel(bell);

      // ── Contexto B: Diego ───────────────────────────────────────────────────
      ctxB = await browser.newContext();
      const pageB = await ctxB.newPage();
      await login(pageB, USERS.diego.email, DEMO_PASSWORD);

      // Diego encuentra el post de Lucía en el feed y reacciona.
      const card = pageB.locator("article").filter({ hasText: text }).first();
      await expect(card).toBeVisible();
      await card
        .getByRole("button", { name: /^Reaccionar con/ })
        .first()
        .click();
      // Confirmación local en B (la reacción quedó aplicada).
      await expect(card.getByText("1 reacción", { exact: true })).toBeVisible();

      // ── Aserción de tiempo real en A ───────────────────────────────────────
      // El badge de la campana de Lucía sube SIN recargar. Esperamos a que el
      // nº de no-leídas supere al inicial (auto-wait con timeout amplio).
      await expect
        .poll(() => unreadFromLabel(bell), { timeout: 20_000 })
        .toBeGreaterThan(before);
    } finally {
      await ctxA?.close();
      await ctxB?.close();
    }
  });
});

/** Extrae el nº de no-leídas del aria-label de la campana ("…, N sin leer"). */
async function unreadFromLabel(
  bell: ReturnType<import("@playwright/test").Page["getByRole"]>,
): Promise<number> {
  const label = (await bell.getAttribute("aria-label")) ?? "";
  const match = label.match(/(\d+)\s+sin leer/);
  return match?.[1] ? Number.parseInt(match[1], 10) : 0;
}
