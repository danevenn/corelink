# CoreLink

Red social interna de empresa — pieza de portfolio.

**Estado:** Fase 1 — fundación (scaffold, tooling y estructura; sin lógica de negocio).

## Stack

- **Next.js 16** (App Router, Server Components/Actions, `src/`, Turbopack)
- **React 19.2** + **TypeScript 6** (strict)
- **Tailwind CSS v4** (CSS-first)
- **Biome 2** (lint + format — sin ESLint/Prettier)
- **Prisma 7** (`prisma-client` generator) + **PostgreSQL 16**
- **better-auth**, **zod**, **@tanstack/react-query**, **motion**
- Gestor de paquetes: **pnpm**

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
| `pnpm db:seed`   | Seed de datos demo (placeholder Fase 3) |

## Documentación

_Placeholder — la documentación del proyecto vive en `src/app/docs/` (pendiente)._
