// Núcleo del sistema de emojis unificados (OpenMoji, CC BY-SA 4.0).
//
// Resuelve el NOMBRE DE FICHERO OpenMoji a partir de un carácter emoji y
// trocea texto plano en segmentos (texto vs emoji) para renderizarlos como SVG.
//
// Convenio de nombres de OpenMoji (el punto delicado):
// - Los ficheros son `<HEXCODE>.svg`, hexcodes en MAYÚSCULAS unidos por "-".
// - OpenMoji ELIMINA el variation selector `FE0F` en emojis de un solo
//   codepoint (p.ej. ❤️ = U+2764 U+FE0F → `2764.svg`; ✅ → `2705.svg`).
// - PERO conserva `FE0F` dentro de secuencias ZWJ y keycaps
//   (p.ej. `2764-FE0F-200D-1F525.svg`, `0023-FE0F-20E3.svg`).
// Estrategia robusta sin manifiesto en cliente: probamos primero el nombre
// CON todos los codepoints (cubre ZWJ/keycaps) y, si la imagen no existe,
// el <img> hace fallback al nombre SIN FE0F (cubre el caso del VS16 suelto);
// si tampoco existe, se muestra el carácter nativo. Ver `EmojiText`.

import emojiRegexFactory from "emoji-regex";

/** Carpeta pública donde se sirven los SVG de OpenMoji (estáticos, lazy). */
export const OPENMOJI_BASE = "/emoji/openmoji";

/** Devuelve los codepoints de un emoji en hex mayúsculas. */
function toCodepoints(emoji: string): string[] {
  return Array.from(emoji).map((ch) =>
    (ch.codePointAt(0) ?? 0).toString(16).toUpperCase(),
  );
}

/**
 * Nombre de fichero OpenMoji PRIMARIO para un emoji, aplicando la regla real
 * de OpenMoji sobre `FE0F` (el VS16):
 * - En una secuencia ZWJ (`200D`) o keycap (`20E3`), el `FE0F` se CONSERVA
 *   (p.ej. `2764-FE0F-200D-1F525`, `0023-FE0F-20E3`).
 * - En cualquier otro caso (emoji "suelto" con VS16: ❤️, ✅, ☺️), el `FE0F`
 *   se ELIMINA → `2764`, `2705`, `263A`.
 * Así evitamos un 404 garantizado (y su flash) en los emojis más comunes.
 */
export function openmojiHexcode(emoji: string): string {
  const cps = toCodepoints(emoji);
  const isSequence = cps.includes("200D") || cps.includes("20E3");
  const effective = isSequence ? cps : cps.filter((c) => c !== "FE0F");
  return effective.join("-");
}

/**
 * Nombre ALTERNATIVO si el primario fallara (cubre el caso opuesto a la regla
 * anterior, raro pero posible según cómo el navegador normalice el emoji):
 * la variante con TODOS los codepoints (incluido `FE0F`). `null` si coincide
 * con el primario (no aporta un nombre distinto que probar).
 */
export function openmojiHexcodeNoVariation(emoji: string): string | null {
  const full = toCodepoints(emoji).join("-");
  return full === openmojiHexcode(emoji) ? null : full;
}

/** URL del SVG primario de OpenMoji para un emoji. */
export function openmojiUrl(emoji: string): string {
  return `${OPENMOJI_BASE}/${openmojiHexcode(emoji)}.svg`;
}

/** URL del SVG alternativo (sin FE0F), o `null` si no aplica. */
export function openmojiUrlNoVariation(emoji: string): string | null {
  const hex = openmojiHexcodeNoVariation(emoji);
  return hex ? `${OPENMOJI_BASE}/${hex}.svg` : null;
}

/** Un trozo de texto: o bien texto plano, o bien un emoji detectado. */
export type EmojiSegment =
  | { type: "text"; value: string }
  | { type: "emoji"; value: string };

// `emoji-regex` devuelve un regex global nuevo en cada llamada; lo creamos una
// sola vez por módulo y lo reutilizamos reseteando `lastIndex` en cada parseo.
const EMOJI_RE = emojiRegexFactory();

/**
 * Trocea un string en segmentos de texto y emoji SIN construir HTML.
 * Pensado para que el consumidor cree nodos React (evita XSS por completo:
 * el contenido del usuario nunca se interpola como HTML).
 */
export function splitEmoji(input: string): EmojiSegment[] {
  if (!input) return [];
  const segments: EmojiSegment[] = [];
  EMOJI_RE.lastIndex = 0;
  let last = 0;
  let match: RegExpExecArray | null;
  match = EMOJI_RE.exec(input);
  while (match !== null) {
    const start = match.index;
    if (start > last) {
      segments.push({ type: "text", value: input.slice(last, start) });
    }
    segments.push({ type: "emoji", value: match[0] });
    last = start + match[0].length;
    match = EMOJI_RE.exec(input);
  }
  if (last < input.length) {
    segments.push({ type: "text", value: input.slice(last) });
  }
  return segments;
}

/** ¿El string contiene al menos un emoji? (atajo para saltar el render). */
export function hasEmoji(input: string): boolean {
  EMOJI_RE.lastIndex = 0;
  return EMOJI_RE.test(input);
}
