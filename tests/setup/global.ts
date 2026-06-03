// Setup GLOBAL de Vitest (se aplica a TODA suite, unit e integración).
//
// Mockea las dependencias de Next y el bus de eventos para que ningún test:
//   - dependa del contexto de request de Next (`next/headers`),
//   - intente revalidar rutas reales (`next/cache`),
//   - abra una conexión Postgres LISTEN/NOTIFY de larga vida (el bus de eventos).
//
// Estos mocks son INERTES por defecto (no hacen nada y no fallan). El control de
// "ejecutar como el usuario X" lo aporta el helper de sesión de integración
// (tests/integration/_helpers/session.ts), que espía `auth.api.getSession`.
//
// NOTA sobre next/headers: se mockea con una función que devuelve unos Headers
// vacíos. Las acciones llaman `auth.api.getSession({ headers: await headers() })`,
// pero en los tests `getSession` está espiado y NO mira esas cabeceras, así que
// basta con que `headers()` no lance.

import { vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
    getAll: vi.fn(() => []),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((fn: unknown) => fn),
}));

// Bus de eventos: stub completo de la interfaz `EventBus`. `publish` resuelve sin
// hacer nada (las notificaciones siguen persistiéndose en BD; solo se silencia el
// tiempo real). `subscribe` devuelve un unsubscribe no-op. Así `createNotification`
// y las acciones de chat funcionan sin abrir LISTEN/NOTIFY.
vi.mock("@/server/events/bus", () => ({
  eventBus: {
    publish: vi.fn(async () => {}),
    subscribe: vi.fn(() => () => {}),
  },
}));
