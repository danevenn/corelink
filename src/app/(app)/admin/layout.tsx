import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ShieldIcon } from "@/components/feed/icons";
import { canModerate, getViewer, isAdmin } from "@/server/authz";

export const metadata: Metadata = {
  title: "Gestión",
  description: "Panel de gestión y moderación de CoreLink.",
};

// PANEL DE GESTIÓN (Fase 10b · ajuste R-staff) — STAFF (admin || moderator).
//
// Gate en SERVIDOR: se decide aquí con `getViewer()`/`canModerate()`. Cualquier
// viewer que no sea staff recibe `notFound()`: no se filtra ni la existencia del
// panel. El panel es ROLE-AWARE: cada rol ve solo lo suyo (el admin lo ve todo;
// el moderador ve Usuarios en solo-lectura + alta de empleados y Moderación, NO
// Canales). Las Server Actions sensibles re-verifican el rol con `requireAdmin`
// (defensa en profundidad), pero aquí ya evitamos renderizar UI de más.
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();
  if (!viewer || !canModerate(viewer.role)) {
    notFound();
  }

  const viewerIsAdmin = isAdmin(viewer.role);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <ShieldIcon className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Gestión
            </h1>
            <p className="text-sm text-muted-foreground">
              {viewerIsAdmin
                ? "Gestión de usuarios, canales y moderación de contenido. Acceso restringido al equipo."
                : "Alta de empleados y moderación de contenido. Acceso restringido al equipo."}
            </p>
          </div>
        </div>

        <AdminTabs viewerIsAdmin={viewerIsAdmin} />
      </header>

      <div>{children}</div>
    </div>
  );
}
