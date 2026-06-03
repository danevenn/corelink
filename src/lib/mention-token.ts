// Tokens de mención `@[displayName](userId)` — utilidades de cliente/servidor.
//
// CONTRATO con el backend (`src/server/mentions.ts`): una mención se incrusta en
// el TEXTO del post/mensaje como un token markdown-link auto-contenido:
//
//     @[displayName](userId)
//
// El backend PARSEA ese token (mismo patrón) para crear filas `Mention` y
// notificar MENTION. Aquí solo:
//   - construimos el token al autocompletar (`buildMentionToken`),
//   - troceamos el contenido en segmentos texto/mención para el render
//     (`splitMentions`), reconstruyendo el `displayName` visible desde el token.
//
// El patrón DEBE ser idéntico al del backend. Como `String.matchAll` exige el
// flag `g`, capturamos AQUÍ tanto el displayName (grupo 1) como el userId
// (grupo 2). El backend solo confía en el userId; el displayName es para pintar.

/**
 * Patrón del token con AMBOS grupos para el render:
 *   - grupo 1 = displayName (cualquier texto sin ']', lazy),
 *   - grupo 2 = userId (sin ')' ni espacios).
 * El subpatrón del id (`[^)\s]+`) coincide EXACTO con la regex del backend
 * (`/@\[[^\]]+?\]\(([^)\s]+)\)/g`); aquí solo añadimos el grupo del nombre.
 */
const MENTION_TOKEN_RENDER = /@\[([^\]]+?)\]\(([^)\s]+)\)/g;

/** Construye el token a insertar en el textarea al elegir un usuario. */
export function buildMentionToken(displayName: string, userId: string): string {
  return `@[${displayName}](${userId})`;
}

/** Un trozo del contenido: texto plano o una mención resuelta. */
export type ContentSegment =
  | { type: "text"; value: string }
  | { type: "mention"; displayName: string; userId: string };

/**
 * Trocea el contenido en segmentos de texto y mención. Los segmentos de texto
 * conservan TODO lo que no sea un token (incluidos emojis) para que el
 * consumidor los pase por el render de emojis existente.
 *
 * No construye HTML: el consumidor emite nodos React (inmune a XSS).
 */
export function splitMentions(input: string): ContentSegment[] {
  if (!input) return [];
  const segments: ContentSegment[] = [];
  // Regex global compartida: reseteamos `lastIndex` en cada parseo.
  MENTION_TOKEN_RENDER.lastIndex = 0;
  let last = 0;
  let match: RegExpExecArray | null = MENTION_TOKEN_RENDER.exec(input);
  while (match !== null) {
    const start = match.index;
    if (start > last) {
      segments.push({ type: "text", value: input.slice(last, start) });
    }
    // grupos garantizados por el patrón; el `?? ""` satisface a TS strict.
    segments.push({
      type: "mention",
      displayName: match[1] ?? "",
      userId: match[2] ?? "",
    });
    last = start + match[0].length;
    match = MENTION_TOKEN_RENDER.exec(input);
  }
  if (last < input.length) {
    segments.push({ type: "text", value: input.slice(last) });
  }
  return segments;
}

/** ¿El string contiene al menos un token de mención? (atajo de render). */
export function hasMention(input: string): boolean {
  MENTION_TOKEN_RENDER.lastIndex = 0;
  return MENTION_TOKEN_RENDER.test(input);
}

/**
 * Versión en TEXTO PLANO del contenido: sustituye cada token por `@displayName`.
 * Útil para snippets de lista donde no queremos enlaces ni el token crudo.
 */
export function mentionsToPlainText(input: string): string {
  if (!hasMention(input)) return input;
  return splitMentions(input)
    .map((seg) => (seg.type === "mention" ? `@${seg.displayName}` : seg.value))
    .join("");
}
