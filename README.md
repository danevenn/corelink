# CoreLink

Red social interna de empresa — pieza de portfolio.

**Estado:** En desarrollo activo — funcionalidad principal implementada (auth, feed, mensajería en tiempo real, notificaciones, admin), con tests unitarios/integración/E2E y CI.

## Stack

- **Next.js 16** (App Router, Server Components/Actions, `src/`, Turbopack)
- **React 19.2** + **TypeScript 6** (strict)
- **Tailwind CSS v4** (CSS-first)
- **Biome 2** (lint + format — sin ESLint/Prettier)
- **Prisma 7** (`prisma-client` generator) + **PostgreSQL 16**
- **better-auth**, **zod**, **@tanstack/react-query**, **motion**
- Gestor de paquetes: **pnpm**

## Funcionalidades

- **Autenticación y organizaciones** (better-auth): cuentas, sesiones, perfiles, organizaciones con miembros e invitaciones.
- **Feed social**: publicaciones, reacciones, menciones y seguimiento (follow).
- **Mensajería en tiempo real**: conversaciones, mensajes y adjuntos (almacenamiento en `@vercel/blob`).
- **Notificaciones**, **búsqueda** y panel de **administración**.
- **Canales** dentro de la organización.
- **Calidad**: 18 modelos de datos, ~13 Server Actions, validación con zod, tests Vitest (unit + integración) y Playwright (E2E) con CI.

## Desarrollo local

```bash
pnpm install                 # instalar dependencias
docker compose up -d         # levantar Postgres 16 local (puerto 5432)
cp .env.example .env         # configurar variables (DATABASE_URL ya apunta al compose)
pnpm prisma generate         # generar el cliente Prisma
pnpm dev                     # arrancar el dev server
```

## Scripts

| Script           | Acción                                  |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo (Turbopack)      |
| `pnpm build`     | Build de producción                     |
| `pnpm typecheck` | `tsc --noEmit` (gate de tipos)          |
| `pnpm check`     | `biome check` (lint + format, gate)     |
| `pnpm lint`      | `biome lint`                            |
| `pnpm format`    | `biome format --write`                  |
| `pnpm db:seed`   | Seed de datos demo                      |

## Documentación

_Placeholder — la documentación del proyecto vive en `src/app/docs/` (pendiente)._
