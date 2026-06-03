// Núcleo del sistema de emojis unificados (Twemoji, gráficos CC-BY 4.0).
//
// Resuelve el NOMBRE DE FICHERO Twemoji a partir de un carácter emoji y
// trocea texto plano en segmentos (texto vs emoji) para renderizarlos como SVG.
//
// Convenio de nombres de Twemoji (el punto delicado):
// - Los ficheros son `<hexcode>.svg`, hexcodes en MINÚSCULAS unidos por "-".
// - Regla de FE0F de Twemoji (`grabTheRightIcon`): si el emoji contiene un ZWJ
//   (U+200D), se CONSERVA el `FE0F`; si NO contiene ZWJ, se ELIMINAN todos los
//   `FE0F`. Esto afecta también a los KEYCAPS (no llevan ZWJ → su FE0F se quita).
//   Ejemplos verificados contra los SVG reales de @discordapp/twemoji v16:
//     ❤️ (U+2764 U+FE0F)            → `2764.svg`        (sin ZWJ → FE0F fuera)
//     ✌️ (U+270C U+FE0F)            → `270c.svg`        (sin ZWJ → FE0F fuera)
//     #️⃣ (U+0023 U+FE0F U+20E3)     → `23-20e3.svg`     (keycap, sin ZWJ → FE0F fuera)
//     👨‍💻 (U+1F468 U+200D U+1F4BB)  → `1f468-200d-1f4bb.svg` (ZWJ → tal cual)
//     ❤️‍🔥 (U+2764 U+FE0F U+200D U+1F525) → `2764-fe0f-200d-1f525.svg` (ZWJ → FE0F dentro)
//     👍🏽 (U+1F44D U+1F3FD)         → `1f44d-1f3fd.svg` (skin tone)
//     🇪🇸 (U+1F1EA U+1F1F8)         → `1f1ea-1f1f8.svg` (bandera)
// Estrategia robusta sin manifiesto en cliente: probamos primero el nombre
// PRIMARIO (regla Twemoji) y, si la imagen no existe, el <img> hace fallback al
// nombre con TODOS los codepoints (incluido FE0F); si tampoco existe, se muestra
// el carácter nativo. Ver `EmojiText`.

import emojiRegexFactory from "emoji-regex";

/** Carpeta pública donde se sirven los SVG de Twemoji (estáticos, lazy). */
export const TWEMOJI_BASE = "/emoji/twemoji";

/** Devuelve los codepoints de un emoji en hex minúsculas. */
function toCodepoints(emoji: string): string[] {
  return Array.from(emoji).map((ch) =>
    (ch.codePointAt(0) ?? 0).toString(16).toLowerCase(),
  );
}

/**
 * Nombre de fichero Twemoji PRIMARIO para un emoji, aplicando la regla real de
 * Twemoji sobre `FE0F` (el VS16):
 * - Si la secuencia contiene un ZWJ (`200d`), se CONSERVA el `FE0F`
 *   (p.ej. `2764-fe0f-200d-1f525`).
 * - En cualquier otro caso (emoji "suelto" con VS16 ❤️/✌️, o keycap #️⃣), se
 *   ELIMINAN todos los `FE0F` → `2764`, `270c`, `23-20e3`.
 * Hexcodes en minúsculas unidos por `-`. Así evitamos un 404 garantizado (y su
 * flash) en los emojis más comunes.
 */
export function emojiAssetName(emoji: string): string {
  const cps = toCodepoints(emoji);
  const hasZwj = cps.includes("200d");
  const effective = hasZwj ? cps : cps.filter((c) => c !== "fe0f");
  return effective.join("-");
}

/**
 * Nombre ALTERNATIVO si el primario fallara (cubre el caso opuesto a la regla
 * anterior, raro pero posible según cómo el navegador normalice el emoji): la
 * variante con TODOS los codepoints (incluido `FE0F`). `null` si coincide con
 * el primario (no aporta un nombre distinto que probar).
 */
export function emojiAssetNameFull(emoji: string): string | null {
  const full = toCodepoints(emoji).join("-");
  return full === emojiAssetName(emoji) ? null : full;
}

/** URL del SVG primario de Twemoji para un emoji. */
export function emojiUrl(emoji: string): string {
  return `${TWEMOJI_BASE}/${emojiAssetName(emoji)}.svg`;
}

/** URL del SVG alternativo (con todos los codepoints), o `null` si no aplica. */
export function emojiUrlFull(emoji: string): string | null {
  const hex = emojiAssetNameFull(emoji);
  return hex ? `${TWEMOJI_BASE}/${hex}.svg` : null;
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
