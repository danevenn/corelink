import { notFound } from "next/navigation";
import { AdminChannelsManager } from "@/components/admin/admin-channels-manager";
import { listAllChannels } from "@/server/admin/channels";
import { getViewer, isAdmin } from "@/server/authz";

// /admin/channels — gestión de canales (SOLO ADMIN).
//
// Ajuste R-staff: el LAYOUT ahora deja entrar a staff (admin || moderator), así
// que esta ruta añade su PROPIO gate solo-admin. Un moderador que la fuerce
// (URL directa) recibe `notFound()` — no se filtra ni su existencia. El CRUD de
// canales ya es admin-only en backend (defensa en profundidad).
//
// Lista activos y archivados; crear/editar/archivar se hacen vía Server Actions
// reinvocadas desde el cliente.
export default async function AdminChannelsPage() {
  const viewer = await getViewer();
  if (!viewer || !isAdmin(viewer.role)) {
    notFound();
  }

  const result = await listAllChannels();

  if (!result.ok) {
    return (
      <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
        {result.error.message}
      </p>
    );
  }

  return <AdminChannelsManager initialChannels={result.data} />;
}
