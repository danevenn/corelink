# Sistema de diseño CoreLink (R2)

> "Workspace luminoso con alma propia." Limpio y aireado como Google Workspace,
> pero **orgánico** y con un **color de marca distintivo que NO es el azul de
> Google**. Construido sobre **shadcn/ui** + **Tailwind CSS v4** (CSS-first).

Los tokens viven en `src/app/globals.css` (variables CSS + `@theme inline`). El
dark mode es **por clase** (`.dark` en `<html>`) gestionado por `next-themes`.

---

## 1. Identidad de marca

- **Marca: teal / esmeralda profundo.** Fresco, profesional y claramente
  diferenciado del azul corporativo. Es el color de acción (botones, enlaces,
  estados activos, marca).
- **Acento secundario: violeta refinado** (`--accent2`), para resplandores y
  toques puntuales sin competir con la marca.
- **Ámbar cálido** reservado a los **"procedimientos oficiales"** (`--official`),
  manteniendo su semántica histórica.

## 2. Paleta (light / dark)

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--background` | `#f6f9f8` | `#0b1413` | Fondo de página (verde muy sutil) |
| `--surface` | `#ffffff` | `#11201d` | Tarjetas, cabeceras, paneles |
| `--surface-muted` | `#eef3f1` | `#182b27` | Fondos secundarios, chips |
| `--foreground` | `#14201d` | `#e7f0ed` | Texto principal |
| `--muted-foreground` | `#4f635d` | `#9bb3ac` | Texto secundario (AA ≥ 5.9:1) |
| `--border` | `#dde7e3` | `#243b35` | Bordes y separadores |
| `--brand` | `#0d9488` | `#2dd4bf` | Marca / primario / acción |
| `--brand-soft` | `#e0f2ee` | `#14342f` | Fondo suave de marca |
| `--accent2` | `#6d5ae6` | `#a594f9` | Acento secundario (violeta) |
| `--official` | `#b45309` | `#fbbf24` | Procedimiento oficial (ámbar) |
| `--success` | `#15803d` | `#4ade80` | Estado correcto |
| `--warning` | `#b45309` | `#fbbf24` | Aviso |
| `--danger` | `#be123c` | `#fb7185` | Error / destructivo |

Cada estado tiene su variante `-soft` para fondos. Los tokens de shadcn
(`--primary`, `--card`, `--popover`, `--ring`, `--destructive`, `--accent`…)
se **mapean** a esta paleta, de modo que los componentes shadcn heredan la
identidad sin colores ad-hoc.

## 3. Tipografía

- **Plus Jakarta Sans** (vía `next/font/google`, variable, self-hosted): una
  geométrica-humanista limpia con carácter, sin penalizar rendimiento. Es la voz
  de marca.
- **Geist** queda como fallback técnico; **Geist Mono** para código/monoespacio.
- Escala: títulos `text-4xl…6xl` con `tracking-tight`; cuerpo `text-sm/base`
  con `leading-relaxed`. Pesos: 400 (cuerpo), 500/600 (UI), 700/800 (titulares).

## 4. Forma y profundidad

- **Radios orgánicos** (más redondeado que el corporativo plano):
  `--radius: 0.75rem` base → escala `sm/md/lg/xl/2xl`. Tarjetas a `rounded-3xl`,
  chips/badges a `rounded-full`.
- **Sombras suaves y luminosas** con tinte verde-neutro:
  `.shadow-soft` (elevación de tarjeta) y `.shadow-elevated` (overlays).
  Hover de tarjetas: `-translate-y-0.5` + `shadow-soft` (microinteracción).
- **Espaciado generoso**: cabeceras `h-16`, sesiones `py-20…32`, gaps `gap-3…6`.

## 5. Accesibilidad

- Foco visible global (`:focus-visible` con anillo de marca, `outline-offset`).
- Contraste AA verificado en texto secundario sobre el fondo más exigente.
- `prefers-reduced-motion` respetado como red de seguridad global.
- Avatares e iconos decorativos son `aria-hidden`; el texto adyacente da el
  contexto. axe = 0 violaciones en las pantallas migradas.

## 6. Componentes base (shadcn/ui)

Instalados con el CLI en `src/components/ui/` (estilo `new-york`, base Radix):
`button`, `input`, `label`, `textarea`, `card`, `avatar`, `badge`, `separator`,
`dropdown-menu`, `dialog`, `tabs`, `tooltip`, `sonner`. Son **aditivos**: el
código previo sigue funcionando.

## 7. Patrones propios

- **`<Avatar>`** (`src/components/feed/avatar.tsx`): por defecto muestra las
  **iniciales** del nombre sobre un círculo de color **determinista** (estable
  por usuario, paleta armonizada con la marca, texto blanco AA). Si hay
  `avatarUrl` (foto subida vía `/api/files`), usa la imagen. Estilo Workspace.
- **Iconos de reacción vectoriales** (`src/components/feed/reaction-icons.tsx`):
  4 SVG propios y coherentes —  **LIKE** (pulgar), **CELEBRATE** (destello),
  **INSIGHTFUL** (bombilla), **SUPPORT** (manos/corazón) — con relleno que se
  "enciende" en estado activo. NO se usan emojis del sistema.
- **Marca** (`src/components/brand.tsx`): `BrandMark` (nodos enlazados) +
  `Wordmark`.
- **Tema** (`src/components/theme-toggle.tsx`): conmuta claro / oscuro / sistema.

## 8. Estado de la migración

Esta tanda (R2) instala la fundación y rediseña **3 pantallas representativas**
como propuesta: **landing** (`/`), **login** (`/login`) y **feed** (`/feed`,
con `app-shell`, `post-card`, `post-composer`, `reaction-bar`). El resto de
pantallas (chat, admin, perfil, notificaciones, búsqueda, cambio de contraseña)
siguen operativas con el estilo anterior y se migrarán tras la aprobación. Los
cambios de avatares e iconos de reacción se propagan a toda la app.
