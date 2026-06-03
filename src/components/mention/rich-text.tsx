// Render combinado de CONTENIDO DE USUARIO: menciones + emojis.
//
// Pipeline en dos pasos, sin construir HTML (nodos React → inmune a XSS):
//   1) Trocea el contenido por TOKENS de mención (`splitMentions`).
//   2) Cada segmento de texto restante se pasa por <EmojiText> (que a su vez lo
//      trocea por emojis y emite islas <EmojiImg>). Cada segmento de mención se
//      pinta como <MentionLink> (enlace al perfil).
//
// Atajo: si el contenido no tiene tokens de mención, delega DIRECTAMENTE en
// <EmojiText> (cero coste extra) — preserva el comportamiento previo.
//
// Sustituye los usos directos de <EmojiText> para contenido de usuario (posts,
// burbujas de chat, hilo). EmojiText sigue existiendo y se usa aquí dentro.

import type { ReactNode } from "react";
import { EmojiText } from "@/components/emoji/emoji-text";
import { hasMention, splitMentions } from "@/lib/mention-token";
import { MentionLink } from "./mention-link";

type Props = {
  children: string;
  /** Clase aplicada a cada <img> de emoji (se reenvía a EmojiText). */
  emojiClassName?: string;
  /**
   * Sube el z-index de los enlaces de mención sobre un overlay-link de la card
   * (post-card en el feed envuelve el cuerpo con un enlace al hilo). Evita
   * anidar <a> dentro de <a> manteniendo la mención clicable.
   */
  raisedMentions?: boolean;
  /**
   * Clases de color para los enlaces de mención en superficies donde el teal
   * por defecto no contrasta (p.ej. la burbuja propia con fondo de marca).
   */
  mentionClassName?: string;
};

export function RichText({
  children,
  emojiClassName,
  raisedMentions,
  mentionClassName,
}: Props): ReactNode {
  // Sin menciones → render de emojis tal cual (camino mayoritario).
  if (!hasMention(children)) {
    return <EmojiText emojiClassName={emojiClassName}>{children}</EmojiText>;
  }

  return splitMentions(children).map((seg, i) =>
    seg.type === "mention" ? (
      <MentionLink
        className={mentionClassName}
        displayName={seg.displayName}
        // biome-ignore lint/suspicious/noArrayIndexKey: segmentos derivados de un string inmutable, sin reordenación.
        key={i}
        raised={raisedMentions}
        userId={seg.userId}
      />
    ) : (
      <EmojiText
        emojiClassName={emojiClassName}
        // biome-ignore lint/suspicious/noArrayIndexKey: idem; el índice identifica la posición del segmento en el texto.
        key={i}
      >
        {seg.value}
      </EmojiText>
    ),
  );
}
