// Renderiza texto del usuario sustituyendo CADA emoji por su SVG de Twemoji.
//
// Server Component: trocea el string con `splitEmoji` y emite nodos React
// (texto plano + islas <EmojiImg> para los emojis). NO usa
// dangerouslySetInnerHTML → inmune a XSS por contenido del usuario.
//
// Si el texto no contiene emojis, devuelve el string tal cual (cero coste,
// cero hidratación). Úsalo en TODOS los sitios donde se muestra texto de
// usuario: posts, respuestas, burbujas de chat, etc.

import type { ReactNode } from "react";
import { hasEmoji, splitEmoji } from "@/lib/emoji";
import { EmojiImg } from "./emoji-img";

type Props = {
  children: string;
  /** Clase aplicada a cada <img> de emoji (tamaño/alineación extra). */
  emojiClassName?: string;
};

export function EmojiText({ children, emojiClassName }: Props): ReactNode {
  // Atajo: la inmensa mayoría del texto no lleva emojis → sin troceo ni islas.
  if (!hasEmoji(children)) return children;

  return splitEmoji(children).map((seg, i) =>
    seg.type === "text" ? (
      // Índice estable: el orden de segmentos es determinista para un string.
      // biome-ignore lint/suspicious/noArrayIndexKey: segmentos derivados de un string inmutable, sin reordenación.
      <span key={i}>{seg.value}</span>
    ) : (
      <EmojiImg
        className={emojiClassName}
        // biome-ignore lint/suspicious/noArrayIndexKey: idem; el índice identifica la posición del emoji en el texto.
        key={i}
        emoji={seg.value}
      />
    ),
  );
}
