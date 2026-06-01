"use client";

// Indicador "X está escribiendo…" efímero con tres puntos animados.
// El padre gestiona la caducidad; aquí solo pintamos según `names`.
// aria-live="polite" lo anuncia sin interrumpir; motion respeta reduce-motion.

import { AnimatePresence, motion } from "motion/react";

type Props = {
  names: string[];
};

function label(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} está escribiendo…`;
  if (names.length === 2) return `${names[0]} y ${names[1]} están escribiendo…`;
  return `${names[0]} y ${names.length - 1} más están escribiendo…`;
}

export function TypingIndicator({ names }: Props) {
  const text = label(names);
  return (
    <div aria-live="polite" className="min-h-6 px-1 pt-2">
      <AnimatePresence>
        {text ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-muted-foreground"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
          >
            <span className="flex items-center gap-0.5" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <motion.span
                  animate={{ y: [0, -3, 0] }}
                  className="block size-1.5 rounded-full bg-muted-foreground"
                  key={i}
                  transition={{
                    duration: 0.9,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </span>
            <span>{text}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
