"use client";

// Animaciones sutiles de entrada para la landing. Island de cliente para que el
// contenido siga siendo Server Component. motion respeta prefers-reduced-motion
// vía MotionConfig (reducedMotion="user").

import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

/** Provee la configuración de motion para toda la landing. */
export function RevealProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fade + slide al entrar en viewport (una sola vez). */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
}
