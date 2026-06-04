// Definición compartida de la navegación de /docs. Datos puros (sin JSX) para
// que tanto el layout (Server Component, sidebar) como cualquier pieza de
// cliente puedan consumirlos sin arrastrar dependencias.

export type DocsNavItem = {
  href: string;
  label: string;
  description: string;
};

export const DOCS_NAV: readonly DocsNavItem[] = [
  {
    href: "/docs",
    label: "Sobre CoreLink",
    description: "Qué es, a qué problema responde y qué incluye.",
  },
  {
    href: "/docs/decisiones",
    label: "Decisiones técnicas",
    description: "El stack y el porqué de cada elección, con sus trade-offs.",
  },
] as const;
