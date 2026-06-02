"use client";

// Proveedor de tema (claro/oscuro) basado en next-themes. Aplica la clase
// `.dark` en <html>, que activa tanto los tokens del sistema de diseño como
// las variantes `dark:` de Tailwind y los componentes shadcn/ui.
// Cliente por necesidad (lee/escribe localStorage y el DOM).

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
