import { AdminChannelsManager } from "@/components/admin/admin-channels-manager";
import { listAllChannels } from "@/server/admin/channels";

// /admin/channels — gestión de canales (SOLO ADMIN, gate en el layout).
// Lista activos y archivados; crear/editar/archivar se hacen vía Server Actions
// reinvocadas desde el cliente.
export default async function AdminChannelsPage() {
  const result = await listAllChannels();

  if (!result.ok) {
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
        {result.error.message}
      </p>
    );
  }

  return <AdminChannelsManager initialChannels={result.data} />;
}
