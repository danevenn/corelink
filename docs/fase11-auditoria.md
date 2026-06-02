# Fase 11 — Auditoría de calidad (a11y · rendimiento · SEO/metadata · seguridad · bundle)

> Auditoría sistemática de CoreLink como pieza de portfolio: objetivo "cumplir
> los estándares web". Realizada en local (Next 16.2.6 · Turbopack · pnpm), app
> arrancando contra Postgres en Docker, navegada logueada con axe-core 4.10.
>
> **Propietarios:** `infra` = config/tooling/metadata/headers/bundle (este agente,
> Fase 11a, **ya aplicados** salvo donde se indique). `ui` = markup/estilos de
> componentes, contraste, estados visuales → **subagente frontend-ui (Fase 11b)**.

## Cómo se midió

- **Accesibilidad:** axe-core 4.10.2 inyectado en runtime sobre cada página clave
  logueado (user `lucia.martin@` y admin `ana.reyes@`): `/`, `/login`, `/feed`,
  `/messages`, `/notifications`, `/search`, `/users/[id]`, `/admin/users`.
- **Rendimiento:** auditoría manual razonada + inspección del output de
  `next build` y tamaños de chunks en `.next/static`. No se ejecutó Lighthouse CLI
  (ver nota en sección Rendimiento).
- **Consola:** logs de navegador capturados durante toda la sesión logueada.
- **Tooling:** `pnpm check` (Biome) y `pnpm typecheck` (tsc) en verde antes y
  después; grep de `any` / `@ts-ignore` / `biome-ignore`.

## Resumen ejecutivo

Estado de partida muy sólido: **0 errores de consola**, **0 problemas de
hidratación o keys de React**, TS strict + `noUncheckedIndexedAccess` +
`noImplicitOverride` limpios, sin `any` y sin `@ts-ignore`; todos los
`biome-ignore` están justificados; `prefers-reduced-motion` cubierto a nivel
global (`globals.css`) y por `MotionConfig`; `:focus-visible` global presente;
imágenes con `alt`; landmarks correctos (1 `main`, `nav`, `h1` por página).

Los problemas reales se concentran en **dos focos**:

1. **Landing pública = boilerplate de create-next-app** (`src/app/page.tsx`):
   logos Next/Vercel, textos en inglés "To get started, edit the page.tsx file",
   enlaces a templates de Vercel. Es la única página pública y la cara del
   portfolio → **Crítico** (propietario `ui`).
2. **Contraste insuficiente del token `--muted-foreground`** (#64748b) sobre
   fondos `--surface-muted`/blanco: 4.34–4.43 vs 4.5 AA. Única violación axe
   recurrente, presente en casi todas las páginas → **Alto** (propietario `ui`,
   pero el cambio es de token en `globals.css`).

Lo de dominio infra (metadata por ruta, favicon, 404 en español, cabeceras de
seguridad) **ya está aplicado en esta Fase 11a** (ver sección "Arreglos aplicados").

### Conteo de hallazgos

| Severidad | Total | infra | ui |
|-----------|:-----:|:-----:|:--:|
| Crítico   | 1     | 0     | 1  |
| Alto      | 4     | 3 ✅  | 1  |
| Medio     | 5     | 3 ✅  | 2  |
| Bajo      | 4     | 1 ✅  | 3  |

(✅ = resuelto en Fase 11a)

---

## Hallazgos priorizados

### CRÍTICO

#### A11Y/SEO-01 · Landing es el boilerplate de create-next-app — `ui`
- **Página/archivo:** `src/app/page.tsx`
- **Descripción:** la home pública sigue siendo la plantilla por defecto: logo
  `next.svg`/`vercel.svg`, h1 "To get started, edit the page.tsx file", párrafos
  y enlaces en inglés a `vercel.com/templates` y `nextjs.org/learn`, botones
  "Deploy Now"/"Documentation". No representa el producto. Además genera el único
  warning de consola de toda la app (Image `vercel.svg` aspect-ratio).
- **Recomendación (frontend-ui):** sustituir por una landing real de CoreLink
  (hero con propuesta de valor en español, CTA a `/login` y "Entrar como
  invitado", secciones de features: feed, canales, chat en tiempo real,
  perfiles). Eliminar los SVG boilerplate de `public/` (`next.svg`, `vercel.svg`,
  `file.svg`, `globe.svg`, `window.svg`) una vez no se usen. Al rehacerla
  desaparece el warning de Image. La metadata Open Graph de la landing ya queda
  bien cubierta por el root layout (infra, ya aplicado).

---

### ALTO

#### A11Y-02 · Contraste del texto secundario por debajo de AA — `ui`
- **Páginas/archivo:** transversal (`/feed`, `/search`, `/users/[id]`,
  `/admin/*`, etc.). Token en `src/app/globals.css`.
- **Descripción:** axe reporta `color-contrast` *serious* de forma recurrente
  (~6 nodos por página). `--muted-foreground: #64748b` sobre `--surface-muted:
  #f1f5f9` da **4.34:1** (texto pequeño exige 4.5:1). Afecta a: metadatos de
  posts, badges de canal (`.bg-surface-muted`), enlace "Siguiendo", cabeceras de
  tabla en admin (`th`), textos de ayuda.
- **Recomendación (frontend-ui):** oscurecer `--muted-foreground` en modo claro
  a ~`#52617a`/`#475569` (slate-600 da ~5.9:1 sobre #f1f5f9) y verificar también
  el equivalente dark (`#8a96b0`). Re-pasar axe tras el cambio: con esto la app
  debería quedar a **0 violaciones automáticas**.

#### SEC-03 · Sin cabeceras de seguridad HTTP — `infra` ✅ RESUELTO
- **Archivo:** `next.config.ts`
- **Descripción:** no existían `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, `Permissions-Policy`, etc. Relevante porque `/api/files`
  sirve contenido subido por usuarios (riesgo de MIME-sniffing) y la app maneja
  sesión.
- **Aplicado:** `async headers()` global en `next.config.ts` con `nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` +
  `Content-Security-Policy: frame-ancestors 'none'`, `Permissions-Policy`
  restrictiva y `X-DNS-Prefetch-Control`. Verificado por `curl -I` y en runtime:
  presentes en todas las rutas; **no rompen SSE, imágenes ni login**.
- **Pendiente recomendado (Fase 12):** ver SEC-08 (CSP completa con nonce).

#### SEO-04 · Sin metadata por ruta (título único "CoreLink") — `infra` ✅ RESUELTO
- **Archivos:** `src/app/layout.tsx` + páginas.
- **Descripción:** solo el root layout tenía metadata; todas las pestañas del
  navegador mostraban "CoreLink", sin `metadataBase`, sin OG, sin `robots`, sin
  favicon (solo SVGs boilerplate).
- **Aplicado:** título con `template "%s · CoreLink"`, `metadataBase`,
  Open Graph + Twitter, `robots {index:false}` (red interna privada → no
  indexar). Títulos por ruta añadidos (ver "Arreglos aplicados"). Favicon de
  marca en `src/app/icon.svg`. Verificado: `/login` → `Iniciar sesión · CoreLink`,
  `/feed` → `Feed · CoreLink`.

#### DOC-05 · Página 404 en inglés (boilerplate) — `infra` ✅ RESUELTO
- **Descripción:** rutas inexistentes mostraban el not-found por defecto de Next
  ("This page could not be found.") en inglés, contradiciendo `<html lang="es">`.
- **Aplicado:** `src/app/not-found.tsx` en español con CTA a `/feed`.

---

### MEDIO

#### PERF-06 · Sin presupuesto de rendimiento medido (Lighthouse no ejecutado) — `infra`
- **Descripción:** no se pudo correr Lighthouse CLI en este entorno (no
  disponible); la medición de LCP/CLS/INP real queda pendiente. Auditoría manual:
  no se observan causas obvias de CLS (imágenes con `width`/`height` o `fill`,
  skeletons con dimensiones fijas en los `loading.tsx`); `motion` respeta reduced
  motion. El bundle es razonable (ver BUNDLE-07).
- **Recomendación:** en Fase 12 (deploy) activar **Vercel Speed Insights** para
  Core Web Vitals reales (INP incluido) y, si se quiere gate local, `lighthouse`
  CLI contra `pnpm build && pnpm start` con presupuesto Performance/Accessibility
  ≥ 90. Documentar resultados aquí.

#### BUNDLE-07 · Chunks grandes de cliente, sin code-splitting de pesos puntuales — `infra`
- **Descripción:** `next build` (Turbopack) ya no imprime First-Load JS por ruta;
  medido sobre `.next/static`: total ~1.6 MB sin comprimir, chunks mayores ~280 KB
  y ~224 KB. Dependencias de cliente pesadas plausibles: `motion` (animaciones,
  presente en 11 componentes) y `@tanstack/react-query`. No hay duplicados
  evidentes en `pnpm-lock.yaml`.
- **Recomendación:** aceptable para una app con esta riqueza de features. Si se
  quiere afinar: cargar `motion` de forma diferida donde no sea crítico para el
  primer render (p. ej. `lightbox`, `attachment-picker` ya son interacciones
  diferidas → candidatos a `next/dynamic`). No bloqueante; medir antes de
  optimizar (PERF-06). **No** se aplicó en 11a para no tocar markup de
  componentes (dominio `ui`/arquitectura).

#### A11Y-08 · Verificación manual de teclado/foco en componentes interactivos — `ui`
- **Descripción:** axe no detecta violaciones de foco, pero los componentes
  interactivos complejos (composer de posts, lightbox de multimedia, diálogos de
  confirmación `confirm-dialog.tsx`, menú de usuario `user-menu.tsx`, hilo de
  chat) requieren verificación manual de: orden de tabulación, trampa de foco en
  modales/lightbox, cierre con `Esc`, retorno de foco al disparador.
- **Recomendación (frontend-ui):** revisar focus-trap y `aria-modal`/`role=dialog`
  en `components/ui/confirm-dialog.tsx` y `components/media/lightbox.tsx`;
  confirmar que el menú de usuario y los desplegables se cierran con teclado.

#### A11Y-09 · Estados vacío/carga/error — cobertura a confirmar — `ui`
- **Descripción:** existen `loading.tsx`/`error.tsx`/`not-found.tsx` en feed,
  channels, messages, users (buena base) y un `EmptyState` reutilizado. Faltan
  `error.tsx` explícitos en algunas rutas (`/search`, `/notifications`, `/admin/*`)
  — heredan el error boundary del grupo, lo cual es válido pero menos específico.
- **Recomendación (frontend-ui):** confirmar que cada ruta async tiene
  loading/empty/error coherentes y con copy en español; añadir `error.tsx`
  específicos donde el genérico no dé contexto suficiente.

#### A11Y-10 · Responsive y dark mode — verificación visual — `ui`
- **Descripción:** dark mode implementado por `prefers-color-scheme` (tokens en
  `globals.css`), sin toggle manual (decisión de diseño). El layout `(app)` tiene
  panel lateral + cabecera y `messages` usa shell con panel oculto en móvil.
- **Recomendación (frontend-ui):** verificar en viewport móvil real el shell de
  `/messages` (lista vs hilo), el composer y las tablas de admin (overflow);
  revisar contraste en dark de `--muted-foreground` junto con A11Y-02.

---

### BAJO

#### SEC-11 · CSP completa (script/style-src) pendiente — `infra` (recomendación)
- **Descripción:** la CSP aplicada se limita a `frame-ancestors 'none'`. Una
  política `script-src`/`style-src` estricta requiere **nonce por petición**
  generado en Middleware/runtime, incompatible con el `headers()` estático de
  `next.config.ts`, y rompería los estilos/scripts inline de `next/font` y del
  runtime de Next, además de necesitar `connect-src 'self'` para el SSE.
- **Recomendación (Fase 12):** implementar CSP basada en nonce vía Middleware
  (Next la inyecta automáticamente en sus scripts si detecta el nonce), con
  `default-src 'self'`, `img-src 'self' https://i.pravatar.cc data:`,
  `connect-src 'self'` (cubre `/api/events`), `style-src 'self' 'unsafe-inline'`
  (Tailwind/next-font), `frame-ancestors 'none'`. Probar que SSE y Better Auth
  siguen funcionando antes de promover a producción.

#### CONS-12 · Warning de consola por Image en landing — `ui`
- **Descripción:** único warning de consola: `vercel.svg` con width/height
  modificado sin el otro. Desaparece al rehacer la landing (A11Y/SEO-01).

#### CLEAN-13 · Assets y rutas vacías heredadas del scaffold — `infra` ✅ (parcial)
- **Descripción:** `public/` contiene SVGs de la plantilla (`next.svg`,
  `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`) sin uso real una vez se
  rehaga la landing. Existen rutas placeholder vacías: `src/app/(marketing)/`
  (solo `.gitkeep`) y `src/app/docs/` (solo `.gitkeep`).
- **Aplicado/recomendación:** no se borran los SVGs aún porque `page.tsx`
  (boilerplate) todavía los referencia; **eliminar junto con A11Y/SEO-01**
  (frontend-ui). Las carpetas `.gitkeep` son inocuas (no generan rutas); dejar o
  limpiar según se usen en Fase 12.

#### A11Y-14 · Localización del idioma del documento — `infra` ✅ RESUELTO (verificado)
- **Descripción:** `<html lang="es">` correcto; el único contenido en inglés era
  el 404 (resuelto, DOC-05) y la landing (A11Y/SEO-01, `ui`).

---

## Arreglos aplicados en esta Fase 11a (dominio infra)

| Archivo | Cambio |
|---------|--------|
| `src/app/layout.tsx` | Metadata enriquecida: `metadataBase`, `title.template "%s · CoreLink"`, descripción, `applicationName`, `robots {index:false}` (red interna), Open Graph + Twitter. |
| `src/app/icon.svg` | **Nuevo.** Favicon de marca (convención de icono de Next App Router). |
| `src/app/not-found.tsx` | **Nuevo.** Página 404 en español con CTA a `/feed` (sustituye al boilerplate en inglés). |
| `src/app/(auth)/login/layout.tsx` | **Nuevo.** Layout-passthrough de servidor que aporta `title: "Iniciar sesión"` (la página es Client Component). |
| `src/app/(auth)/register/layout.tsx` | **Nuevo.** Ídem con `title: "Crear cuenta"`. |
| `src/app/(app)/feed/page.tsx` | `metadata.title = "Feed"`. |
| `src/app/(app)/messages/page.tsx` | `metadata.title = "Mensajes"`. |
| `src/app/(app)/notifications/page.tsx` | `metadata.title = "Notificaciones"`. |
| `src/app/(app)/search/page.tsx` | `generateMetadata` dinámico: `"Buscar: <query>"`. |
| `src/app/(app)/admin/layout.tsx` | `metadata.title = "Administración"`. |
| `src/app/(app)/users/[id]/page.tsx` | `generateMetadata` con el nombre del perfil. |
| `src/app/(app)/channels/[slug]/page.tsx` | `generateMetadata` con `#<canal>`. |
| `next.config.ts` | `async headers()` global con cabeceras de seguridad (nosniff, Referrer-Policy, X-Frame-Options/`frame-ancestors`, Permissions-Policy, DNS-Prefetch). CSP completa documentada como recomendación (SEC-11). |

**Verificación tras los arreglos:** `pnpm check`, `pnpm typecheck` y `pnpm build`
en **verde**. Smoke test logueado: login OK, `/feed` carga, títulos por ruta
correctos, cabeceras presentes en todas las rutas, **SSE `/api/events` abre sin
error**, imágenes (avatares vía optimizador y `/api/files`) cargan, **0 errores
de consola**.

## Trabajo para frontend-ui (Fase 11b) — checklist

1. **A11Y/SEO-01 (Crítico):** rehacer la landing `src/app/page.tsx` con contenido
   real de CoreLink; eliminar SVGs boilerplate de `public/`.
2. **A11Y-02 (Alto):** subir el contraste de `--muted-foreground` (claro y dark)
   en `globals.css` y re-pasar axe hasta 0 violaciones.
3. **A11Y-08:** verificación manual de foco/teclado en modales, lightbox, menús.
4. **A11Y-09:** confirmar/añadir estados loading/empty/error por ruta.
5. **A11Y-10:** verificación responsive + dark mode (especialmente `/messages` y
   tablas de admin).
