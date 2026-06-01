import { notFound } from "next/navigation";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ShieldIcon } from "@/components/feed/icons";
import { getViewer, isAdmin } from "@/server/authz";

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
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
            <ShieldIcon className="size-5" />
          </span>
          <h1 className="text-lg font-semibold text-foreground">
            Administración
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Gestión de usuarios, canales y moderación de contenido. Acceso
          restringido a administradores.
        </p>
      </header>

      <AdminTabs />

      <div>{children}</div>
    </div>
  );
}
