-- R1: cambio de contraseña forzado en el primer login.
--
-- Añade `mustChangePassword` (Boolean nullable, default false) a `user`. Las
-- cuentas creadas por la empresa (alta de empleados) nacen con `true` y una
-- contraseña temporal; el gate de la zona protegida bloquea el resto de la app
-- hasta que el empleado la cambie. La Server Action `changeOwnPassword` lo pone
-- a `false` tras cambiarla.
--
-- IMPORTANTE (FTS): esta migración SOLO toca la tabla `user`, que NO tiene
-- columna `search_vector`. Se ESCRIBE A MANO (patrón Fases 8a/9a/10a) para
-- garantizar que NO se emite ningún DROP de las columnas `search_vector`
-- (tsvector) ni de sus índices GIN en `post`/`profile`, que Prisma no modela y
-- que `migrate dev` querría DROPear. Aquí NO se toca nada de post/profile.

ALTER TABLE "user" ADD COLUMN "mustChangePassword" BOOLEAN DEFAULT false;
