# CoreLink

Red social interna de empresa (pieza de portfolio). Next.js 16 App Router.

## Stack
- **Next.js 16** (App Router, Server Components/Actions, Turbopack) + **React 19.2** + **TypeScript 6** strict
- **Prisma 7** (generator `prisma-client`) + **PostgreSQL 16** (Docker local, puerto 5432)
- **better-auth** · **zod** · **@tanstack/react-query** · **motion** · **@vercel/blob**
- **Tailwind CSS v4** (CSS-first) · **Biome 2** (lint+format, NO ESLint/Prettier) · **pnpm**

## Eficiencia de contexto (importante)
- **NO leas `src/generated/`** — es el cliente Prisma autogenerado (~36k líneas, está en `.gitignore`). Si necesitas el modelo de datos, **la fuente canónica es `prisma/schema.prisma`**.
- Empieza por `prisma/schema.prisma` + el área de `src/` relevante; evita escanear el repo entero.

## Estructura
- `src/app/` — rutas: grupos `(app)` (messages, feed, chat, admin, notifications, search, users), `(marketing)`, `(auth)`, `api/`, `docs/`
- `src/server/` — lógica de servidor (admin, storage, events)
- `src/components/` — UI por dominio (`ui/`, chat, feed, mention, media, emoji, events, admin, marketing)
- `src/lib/` — utilidades + `validations/` (esquemas zod)
- `src/hooks/`

## Comandos
- `pnpm dev` — dev server (Turbopack)
- `pnpm typecheck` — `tsc --noEmit` (gate de tipos)
- `pnpm check` — `biome check` (lint+format, gate)
- `pnpm test` / `test:integration` / `test:e2e` — Vitest / Playwright
- `pnpm prisma generate` — regenerar cliente tras tocar el schema
- `docker compose up -d` — Postgres 16 local

## Convenciones
- Validación con **zod** en `src/lib/validations/`; valida en Server Actions/Route Handlers.
- Formatea/lintea con **Biome** (`pnpm format`), nunca con Prettier/ESLint.
- Tras editar `prisma/schema.prisma`, ejecuta `pnpm prisma generate`.
