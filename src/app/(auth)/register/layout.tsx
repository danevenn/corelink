import type { Metadata } from "next";

// La página de registro es un Client Component, así que el título por ruta se
// aporta desde este layout-passthrough de servidor (sin tocar el markup).
export const metadata: Metadata = {
  title: "Crear cuenta",
  description: "Únete a tu equipo en CoreLink.",
};

export default function RegisterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
