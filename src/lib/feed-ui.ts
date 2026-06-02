import type { ReactionType } from "@/generated/prisma/enums";

// Helpers de presentación puros del feed (sin estado, sin servidor).

/** Fecha relativa en español, compacta. Determinista respecto a "ahora". */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(date).getTime();
  const sec = Math.round(diffMs / 1000);

  if (sec < 45) return "ahora mismo";
  const min = Math.round(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hour = Math.round(min / 60);
  if (hour < 24) return `hace ${hour} h`;
  const day = Math.round(hour / 24);
  if (day < 7) return `hace ${day} d`;
  const week = Math.round(day / 7);
  if (week < 5) return `hace ${week} sem`;

  return new Date(date).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year:
      new Date(date).getFullYear() === now.getFullYear()
        ? undefined
        : "numeric",
  });
}

/** Fecha absoluta legible para tooltips/title. */
export function absoluteTime(date: Date): string {
  return new Date(date).toLocaleString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Iniciales (máx. 2) a partir de un nombre para el avatar de fallback. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  const last = parts[parts.length - 1];
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase();
}

// Paleta determinista para avatares de fallback (hash simple del id).
// Paleta determinista para avatares por iniciales (estilo Workspace).
// Tonos -700/-800: profundos y vivos, con TEXTO BLANCO que cumple contraste AA
// (≥4.5:1) en todos ellos. Armonizados alrededor del teal de marca (sin azul
// Google) — verificado con axe en pantallas reales.
const AVATAR_COLORS = [
  "bg-teal-700",
  "bg-emerald-700",
  "bg-cyan-800",
  "bg-violet-700",
  "bg-fuchsia-700",
  "bg-rose-700",
  "bg-amber-700",
  "bg-orange-700",
  "bg-sky-800",
  "bg-indigo-700",
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? "bg-teal-700";
}

// Metadatos de cada tipo de reacción: etiqueta accesible. Los iconos son SVG
// vectoriales propios (ver components/feed/reaction-icons.tsx), no emojis.
export const REACTION_META: Record<ReactionType, { label: string }> = {
  LIKE: { label: "Me gusta" },
  CELEBRATE: { label: "Celebrar" },
  INSIGHTFUL: { label: "Interesante" },
  SUPPORT: { label: "Apoyo" },
};

export const REACTION_ORDER: ReactionType[] = [
  "LIKE",
  "CELEBRATE",
  "INSIGHTFUL",
  "SUPPORT",
];
