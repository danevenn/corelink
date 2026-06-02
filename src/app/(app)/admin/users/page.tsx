import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { listAllChannels } from "@/server/admin/channels";
import { listUsers } from "@/server/admin/users";
import { getViewer, isAdmin } from "@/server/authz";

// /admin/users — gestión de usuarios y roles (SOLO ADMIN, gate en el layout).
// La primera página se renderiza en servidor; la búsqueda/paginación posterior
// se hace desde el cliente reinvocando la Server Action `listUsers`.
//
// R2: además del listado, cargamos los canales DEPARTMENT (no archivados) para
// el alta de empleados y pasamos `viewerIsAdmin` (decide los roles ofrecidos).
export default async function AdminUsersPage() {
  const [viewer, result, channelsResult] = await Promise.all([
    getViewer(),
    listUsers({ page: 1 }),
    listAllChannels(),
  ]);

  if (!result.ok) {
    return (
      <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
        {result.error.message}
      </p>
    );
  }

  const departments = channelsResult.ok
    ? channelsResult.data
        .filter((c) => c.type === "DEPARTMENT" && !c.archivedAt)
        .map((c) => ({ id: c.id, name: c.name }))
    : [];

  return (
    <AdminUsersTable
      currentUserId={viewer?.id ?? ""}
      departments={departments}
      initialPage={result.data}
      viewerIsAdmin={isAdmin(viewer?.role ?? "user")}
    />
  );
}
