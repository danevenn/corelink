import type { Metadata } from "next";

// La página de login es un Client Component (usa hooks de navegación), por lo
// que no puede exportar `metadata`. Este layout-passthrough de servidor aporta
// el título por ruta sin alterar el markup.
export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accede a tu espacio de trabajo en CoreLink.",
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
