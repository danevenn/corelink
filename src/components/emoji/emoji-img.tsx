"use client";

// Imagen de UN emoji renderizado como SVG de OpenMoji.
//
// Es la única parte cliente del render de emojis: necesita `onError` para la
// cadena de fallback de nombres de OpenMoji (con FE0F → sin FE0F → carácter
// nativo). El texto que lo rodea se renderiza en el servidor (ver `EmojiText`).
//
// Seguridad: recibe el carácter emoji ya troceado por `splitEmoji`; nunca
// interpola HTML. El `alt`/`aria-label` es el nombre del emoji o el propio
// carácter (no hay vector XSS en atributos de texto de React).

import { useState } from "react";
import { openmojiUrl, openmojiUrlNoVariation } from "@/lib/emoji";
import { cn } from "@/lib/utils";

type Props = {
  /** El carácter emoji (puede ser una secuencia ZWJ / skin tone). */
  emoji: string;
  /** Nombre accesible; por defecto el propio carácter. */
  label?: string;
  className?: string;
};

// Paso de la cadena de fallback en el que está esta imagen.
type Stage = "primary" | "noVariation" | "native";

export function EmojiImg({ emoji, label, className }: Props) {
  const [stage, setStage] = useState<Stage>("primary");

  // Fallback final: el carácter nativo del sistema (cobertura garantizada).
  if (stage === "native") {
    return (
      <span aria-label={label ?? emoji} role="img">
        {emoji}
      </span>
    );
  }

  const altUrl = openmojiUrlNoVariation(emoji);
  const src = stage === "noVariation" && altUrl ? altUrl : openmojiUrl(emoji);

  return (
    // biome-ignore lint/performance/noImgElement: SVG estático same-origin servido bajo demanda; next/image no aporta aquí (sin optimización de SVG) y añadiría overhead.
    <img
      alt={label ?? emoji}
      className={cn(
        "inline-block h-[1.2em] w-[1.2em] select-none align-[-0.2em]",
        className,
      )}
      decoding="async"
      draggable={false}
      loading="lazy"
      onError={() => {
        // 1.º intento (CON FE0F) falló → prueba SIN FE0F si existe esa variante;
        // si no, salta directo al carácter nativo.
        setStage((s) => (s === "primary" && altUrl ? "noVariation" : "native"));
      }}
      src={src}
    />
  );
}
