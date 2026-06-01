import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { listUsers } from "@/server/admin/users";
import { getViewer } from "@/server/authz";

// /admin/users — gestión de usuarios y roles (SOLO ADMIN, gate en el layout).
// La primera página se renderiza en servidor; la búsqueda/paginación posterior
// se hace desde el cliente reinvocando la Server Action `listUsers`.
export default async function AdminUsersPage() {
  const viewer = await getViewer();
  const result = await listUsers({ page: 1 });

  if (!result.ok) {
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
        {result.error.message}
      </p>
    );
  }

  return (
    <AdminUsersTable
      currentUserId={viewer?.id ?? ""}
      initialPage={result.data}
    />
  );
}
