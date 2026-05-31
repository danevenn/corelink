import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Layout del grupo autenticado. Defensa en profundidad: además del middleware,
// el servidor revalida la sesión aquí antes de renderizar cualquier ruta protegida.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
