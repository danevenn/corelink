// Hooks compartidos por TODA suite de integración. Importa este módulo al inicio
// del archivo de test (`import "./_helpers/setup"` con la ruta adecuada) para:
//   - instalar el espía de sesión (`auth.api.getSession`) una vez por archivo,
//   - dejar la BD limpia ANTES de cada test (TRUNCATE),
//   - desconectar el pool de Prisma al terminar el archivo.
//
// Cada test parte de BD vacía + "sin sesión" (anónimo); el propio test siembra
// sus fixtures y envuelve las acciones en `runAs(...)`.

import { afterAll, beforeAll, beforeEach } from "vitest";
import { disconnectDb, resetDb } from "./db";
import { installSessionSpy, setCurrentUser } from "./session";

beforeAll(() => {
  installSessionSpy();
});

beforeEach(async () => {
  setCurrentUser(null);
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});
