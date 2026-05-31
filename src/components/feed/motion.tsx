"use client";

// Envoltorios de animación con motion. Aislados como client components para
// que las cards (server) puedan animarse sin volverse cliente ellas mismas.
// motion respeta prefers-reduced-motion vía MotionConfig.

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

/** Configura motion para todo el árbol: respeta reduce-motion del usuario. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Entrada escalonada del feed: fade + slide sutil. */
export function FeedItem({
  children,
  index = 0,
}: {
  children: ReactNode;
  index?: number;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 12 }}
      transition={{
        duration: 0.3,
        delay: Math.min(index * 0.04, 0.4),
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/** Aparición simple (detalle, compositor). */
export function FadeIn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={className}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Presencia para listas mutables (respuestas que aparecen/desaparecen). */
export function Presence({ children }: { children: ReactNode }) {
  return <AnimatePresence initial={false}>{children}</AnimatePresence>;
}

/** Item con salida animada, para respuestas borrables. */
export function ExitItem({
  children,
  layoutId,
}: {
  children: ReactNode;
  layoutId?: string;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      initial={{ opacity: 0, height: "auto" }}
      key={layoutId}
      layout
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
