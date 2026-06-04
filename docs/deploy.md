# Despliegue (Fase 12) — Vercel + Neon + Vercel Blob

Guía para llevar CoreLink a producción en **Vercel (Hobby, gratis)** con
**Neon** (Postgres) y **Vercel Blob** (imágenes). Pensada para una demo pública
de portfolio.

> Resumen de piezas que ya están listas en el repo:
> - `vercel.json` — `framework: nextjs` + **cron** diario que resetea la demo.
> - Driver de almacenamiento Blob (`src/server/storage/vercel-blob-driver.ts`),
>   se activa con `STORAGE_DRIVER=vercel-blob` + `BLOB_READ_WRITE_TOKEN`.
> - Bus SSE de tiempo real que usa `DIRECT_DATABASE_URL` (Neon unpooled).
> - Endpoint `GET /api/cron/reset-demo` protegido por `CRON_SECRET`.
> - `@vercel/speed-insights` montado en el root layout.

## 1. Enlazar el proyecto

```bash
vercel link
```

## 2. Provisionar la base de datos (Neon)

Instala la integración de Neon desde el Marketplace de Vercel (auto-provisiona
el proyecto e **inyecta las env vars** en el proyecto Vercel):

```bash
vercel integration add neon
```

Esto deja `DATABASE_URL` (pooled) y, normalmente, una variante UNPOOLED
(`DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING`). **Copia el valor
unpooled a `DIRECT_DATABASE_URL`** (lo necesita el bus SSE para LISTEN/NOTIFY;
la URL pooled pasa por PgBouncer y no lo soporta):

```bash
vercel env add DIRECT_DATABASE_URL production   # pega el endpoint SIN `-pooler`
```

## 3. Provisionar el almacenamiento (Vercel Blob)

Crea un **Blob store** y conéctalo al proyecto (Dashboard → Storage → Blob, o
vía Marketplace). Al conectarlo, Vercel inyecta `BLOB_READ_WRITE_TOKEN`. Activa
el driver de Blob:

```bash
vercel env add STORAGE_DRIVER production        # valor: vercel-blob
```

Las imágenes se servirán desde su URL pública
(`https://<id>.public.blob.vercel-storage.com/...`), directa en `<img>` sin
pasar por `/api/files`. No requiere `next/image` remotePatterns y la CSP del
proyecto (`frame-ancestors 'none'`) no la bloquea.

## 4. Resto de variables de entorno (a mano)

```bash
vercel env add BETTER_AUTH_SECRET   production   # openssl rand -base64 32
vercel env add BETTER_AUTH_URL      production   # https://<tu-deploy>.vercel.app (sin barra final)
vercel env add NEXT_PUBLIC_DEMO_MODE production   # true
vercel env add CRON_SECRET          production   # openssl rand -hex 32
```

> **Gotcha Better Auth:** `BETTER_AUTH_URL` debe ser EXACTAMENTE la URL pública
> del deploy. Better Auth deriva sus `trustedOrigins` de ahí y valida el origin
> de las peticiones de auth; si no coincide, los logins fallan. Si usas dominio
> propio, pon ese dominio (no el `.vercel.app`).

La lista completa con explicación de cada env está en `.env.example`
(sección "PRODUCCIÓN (Vercel)").

## 5. Migraciones y seed (una vez)

Trae las envs de prod a local y aplica el esquema + datos demo contra Neon:

```bash
vercel env pull .env.local
# Migraciones (idempotente):
DATABASE_URL="<DATABASE_URL de Neon>" pnpm prisma migrate deploy
# Seed idempotente (limpia y resiembra el estado demo):
DATABASE_URL="<DATABASE_URL de Neon>" pnpm db:seed
```

Usuarios demo sembrados: `*@corelink.demo`, contraseña `corelink-demo-2026`
(admin `ana.reyes`, moderador `marc.soler`, usuarios `lucia.martin` /
`diego.ferrer` / `noa.vidal`).

## 6. Cron de reseteo de la demo

Ya configurado en `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/reset-demo", "schedule": "0 3 * * *" }] }
```

- Se ejecuta **a diario a las 03:00 UTC** (el plan **Hobby permite crons
  diarios**; la hora exacta puede variar dentro de la franja).
- Vercel invoca el endpoint enviando AUTOMÁTICAMENTE
  `Authorization: Bearer $CRON_SECRET` (porque `CRON_SECRET` está en las envs).
  El endpoint resiembra la BD demo al estado semilla.

## 7. Desplegar

```bash
vercel deploy --prod
```

Tras desplegar, verifica: login con cuenta demo, subida de imagen (debe quedar
en `*.public.blob.vercel-storage.com`), tiempo real (SSE) y, opcionalmente,
disparar el cron a mano para confirmar el reseteo:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<tu-deploy>/api/cron/reset-demo
```

## Observabilidad

- **Vercel Speed Insights** ya integrado (Core Web Vitals reales: LCP, CLS,
  INP). Actívalo en el dashboard del proyecto (Speed Insights) para empezar a
  recibir datos; el componente es un no-op fuera de Vercel.

## Endurecimiento futuro (fuera del alcance de la demo)

- **Blob privado**: para imágenes sensibles, `access: "private"` + lectura
  autenticada vía `get()` y un route handler auth-gated, en lugar de URL pública.
- **CSP estricta**: hoy solo `frame-ancestors 'none'`. Una `script-src` con
  nonces por petición requeriría moverla a Middleware (ver
  `docs/fase11-auditoria.md`).
