import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ShieldIcon } from "@/components/feed/icons";
import { getViewer, isAdmin } from "@/server/authz";

export const metadata: Metadata = {
  title: "Administración",
  description: "Panel de administración y moderación de CoreLink.",
};

// PANEL DE ADMINISTRACIÓN (Fase 10b) — SOLO ADMIN.
//
// Gate en SERVIDOR: se decide aquí con `getViewer()`/`isAdmin()`. Cualquier
// viewer que no sea admin (incluido `moderator`) recibe `notFound()`: no se
// filtra ni la existencia del panel. Las Server Actions de admin re-verifican
// el rol de nuevo (defensa en profundidad), pero nunca renderizamos UI de más.
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  if (!viewer || !isAdmin(viewer.role)) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <ShieldIcon className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Administración
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestión de usuarios, canales y moderación de contenido. Acceso
              restringido a administradores.
            </p>
          </div>
        </div>

        <AdminTabs />
      </header>

      <div>{children}</div>
    </div>
  );
}
