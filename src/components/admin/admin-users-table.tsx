"use client";

// Tabla de gestión de usuarios (Fase 10b · ajuste R-staff) — STAFF, role-aware.
//
// Consume las Server Actions de `src/server/admin/users.ts`:
//   listUsers (lectura para staff: búsqueda + paginación), setUserRole, banUser,
//   unbanUser, deleteUser. Las mutaciones son solo-ADMIN: re-verifican el rol en
//   servidor (defensa en profundidad); aquí solo pintamos y reflejamos sus
//   resultados/errores. UI optimista donde es seguro (rol); las acciones
//   destructivas (ban/eliminar) pasan SIEMPRE por confirmación.
//
// ROLE-AWARE (`viewerIsAdmin`): para el MODERADOR la tabla es de SOLO LECTURA
// (rol como etiqueta, sin selector ni acciones de ban/rol/eliminar), pero SÍ
// puede "Dar de alta empleado". Para el ADMIN se muestran todos los controles.

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CreateEmployeeDialog } from "@/components/admin/create-employee-dialog";
import { Avatar } from "@/components/feed/avatar";
import { BanIcon, SearchIcon, TrashIcon } from "@/components/feed/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  type AdminUserRow,
  type AdminUsersPage,
  banUser,
  deleteUser,
  listUsers,
  setUserRole,
  unbanUser,
} from "@/server/admin/users";

type Role = "user" | "moderator" | "admin";

type DepartmentOption = { id: string; name: string };

type Props = {
  initialPage: AdminUsersPage;
  /** Id del admin que está viendo el panel (para distinguirlo y avisarlo). */
  currentUserId: string;
  /** ¿El viewer es admin? Controla qué roles ofrece el alta de empleados. */
  viewerIsAdmin: boolean;
  /** Canales DEPARTMENT no archivados para el alta de empleados. */
  departments: DepartmentOption[];
};

const ROLE_LABEL: Record<Role, string> = {
  user: "Usuario",
  moderator: "Moderador",
  admin: "Admin",
};

export function AdminUsersTable({
  initialPage,
  currentUserId,
  viewerIsAdmin,
  departments,
}: Props) {
  const [page, setPage] = useState<AdminUsersPage>(initialPage);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const searchId = useId();
  const firstRender = useRef(true);

  // Recarga una página desde servidor (búsqueda/paginación).
  function load(opts: { page?: number; search?: string }) {
    setLoading(true);
    startTransition(async () => {
      const res = await listUsers({
        page: opts.page ?? 1,
        ...(opts.search ? { search: opts.search } : {}),
      });
      setLoading(false);
      if (!res.ok) {
        setStatus(res.error.message);
        return;
      }
      setPage(res.data);
    });
  }

  // Búsqueda con debounce (evita una petición por tecla — amable con INP).
  // biome-ignore lint/correctness/useExhaustiveDependencies: el efecto solo debe reaccionar a `search`; `load` es estable en la práctica.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = setTimeout(() => {
      load({ page: 1, search: search.trim() });
    }, 350);
    return () => clearTimeout(id);
  }, [search]);

  // Actualiza una fila en memoria tras una mutación puntual (evita recargar todo).
  function patchRow(userId: string, patch: Partial<AdminUserRow>) {
    setPage((p) => ({
      ...p,
      users: p.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
    }));
  }

  function removeRow(userId: string) {
    setPage((p) => ({
      ...p,
      users: p.users.filter((u) => u.id !== userId),
      total: Math.max(0, p.total - 1),
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabecera: buscador + alta de empleados */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <label className="sr-only" htmlFor={searchId}>
            Buscar usuarios por nombre
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-full border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-brand"
            id={searchId}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            type="search"
            value={search}
          />
        </div>

        <CreateEmployeeDialog
          departments={departments}
          onCreated={() => load({ page: 1, search: search.trim() })}
          viewerIsAdmin={viewerIsAdmin}
        />
      </div>

      {/* Resultado / estado en vivo */}
      <p aria-live="polite" className="sr-only" role="status">
        {status ?? `${page.total} usuarios`}
      </p>

      {/* El contenedor con scroll horizontal debe ser enfocable por teclado
          para desplazarlo sin ratón (axe scrollable-region-focusable). Se usa
          <section> (landmark con aria-label) en vez de role="region". */}
      <section
        aria-label="Tabla de usuarios"
        className="overflow-x-auto rounded-3xl border border-border bg-surface shadow-soft"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: contenedor scrollable enfocable a propósito por accesibilidad (axe)
        tabIndex={0}
      >
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <caption className="sr-only">
            Lista de usuarios con rol, estado y acciones de administración
          </caption>
          <thead>
            <tr className="border-b border-border bg-surface-muted/50 text-left text-xs font-semibold text-muted-foreground">
              <th className="px-4 py-2.5" scope="col">
                Usuario
              </th>
              <th className="px-4 py-2.5" scope="col">
                Rol
              </th>
              <th className="px-4 py-2.5" scope="col">
                Estado
              </th>
              <th className="px-4 py-2.5" scope="col">
                Posts
              </th>
              <th className="px-4 py-2.5 text-right" scope="col">
                {viewerIsAdmin ? (
                  "Acciones"
                ) : (
                  <span className="sr-only">Acciones</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className={cn(loading && "opacity-60 transition-opacity")}>
            {page.users.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-8 text-center text-muted-foreground"
                  colSpan={5}
                >
                  No se han encontrado usuarios.
                </td>
              </tr>
            ) : (
              page.users.map((u) => (
                <UserRow
                  currentUserId={currentUserId}
                  key={u.id}
                  onPatch={patchRow}
                  onRemove={removeRow}
                  onStatus={setStatus}
                  user={u}
                  viewerIsAdmin={viewerIsAdmin}
                />
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Paginación */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground tabular-nums">
          Página {page.page} · {page.total} usuarios
        </span>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-border px-3 py-1.5 font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-40"
            disabled={page.page <= 1 || loading}
            onClick={() => load({ page: page.page - 1, search: search.trim() })}
            type="button"
          >
            Anterior
          </button>
          <button
            className="rounded-full border border-border px-3 py-1.5 font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-40"
            disabled={!page.hasMore || loading}
            onClick={() => load({ page: page.page + 1, search: search.trim() })}
            type="button"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user,
  currentUserId,
  viewerIsAdmin,
  onPatch,
  onRemove,
  onStatus,
}: {
  user: AdminUserRow;
  currentUserId: string;
  /** ¿El viewer es admin? Si no (moderador), la fila es de solo lectura. */
  viewerIsAdmin: boolean;
  onPatch: (id: string, patch: Partial<AdminUserRow>) => void;
  onRemove: (id: string) => void;
  onStatus: (msg: string) => void;
}) {
  const isSelf = user.id === currentUserId;
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState<"ban" | "delete" | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState("");
  const roleSelectId = useId();

  function changeRole(role: Role) {
    if (role === user.role) return;
    const prev = user.role;
    onPatch(user.id, { role }); // optimista
    startTransition(async () => {
      const res = await setUserRole(user.id, role);
      if (!res.ok) {
        onPatch(user.id, { role: prev }); // revertir
        onStatus(res.error.message);
        return;
      }
      onStatus(`Rol de ${user.displayName} actualizado a ${ROLE_LABEL[role]}.`);
    });
  }

  function confirmBan() {
    setDialogError(null);
    const days = banDays.trim() ? Number.parseInt(banDays, 10) : undefined;
    startTransition(async () => {
      const res = await banUser(user.id, {
        ...(banReason.trim() ? { reason: banReason.trim() } : {}),
        ...(days && days > 0 ? { expiresInDays: days } : {}),
      });
      if (!res.ok) {
        setDialogError(res.error.message);
        return;
      }
      onPatch(user.id, {
        banned: true,
        banReason: banReason.trim() || null,
      });
      onStatus(
        `${user.displayName} ha sido baneado. Sus sesiones se revocaron.`,
      );
      setDialog(null);
      setBanReason("");
      setBanDays("");
    });
  }

  function unban() {
    startTransition(async () => {
      const res = await unbanUser(user.id);
      if (!res.ok) {
        onStatus(res.error.message);
        return;
      }
      onPatch(user.id, { banned: false, banReason: null });
      onStatus(`${user.displayName} ha sido desbaneado.`);
    });
  }

  function confirmDelete() {
    setDialogError(null);
    startTransition(async () => {
      const res = await deleteUser(user.id);
      if (!res.ok) {
        setDialogError(res.error.message);
        return;
      }
      onRemove(user.id);
      onStatus(
        `La cuenta de ${user.displayName} y su contenido se eliminaron.`,
      );
      setDialog(null);
    });
  }

  return (
    <tr
      className={cn(
        "border-b border-border last:border-0",
        isSelf && "bg-brand-soft/30",
      )}
    >
      {/* Usuario */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            name={user.displayName}
            seed={user.id}
            size="sm"
            src={user.avatarUrl}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-medium text-foreground">
                {user.displayName}
              </span>
              {isSelf ? (
                <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                  Tú
                </span>
              ) : null}
            </div>
            <span className="block truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
      </td>

      {/* Rol: selector editable solo para admin; etiqueta de solo lectura para
          el moderador (las mutaciones de rol son solo-admin en backend). */}
      <td className="px-4 py-3">
        {viewerIsAdmin ? (
          <>
            <label className="sr-only" htmlFor={roleSelectId}>
              Rol de {user.displayName}
            </label>
            <select
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground outline-none transition focus:border-brand disabled:opacity-50"
              disabled={pending}
              id={roleSelectId}
              onChange={(e) => changeRole(e.target.value as Role)}
              value={user.role}
            >
              <option value="user">Usuario</option>
              <option value="moderator">Moderador</option>
              <option value="admin">Admin</option>
            </select>
          </>
        ) : (
          <span className="inline-flex items-center rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground">
            {ROLE_LABEL[user.role]}
          </span>
        )}
      </td>

      {/* Estado */}
      <td className="px-4 py-3">
        {user.banned ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger"
            title={user.banReason ?? "Baneado"}
          >
            <BanIcon className="size-3" />
            Baneado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-[#0f5c2e] dark:text-success">
            Activo
          </span>
        )}
      </td>

      {/* Posts */}
      <td className="px-4 py-3 text-muted-foreground tabular-nums">
        {user.postCount}
      </td>

      {/* Acciones (solo admin: las mutaciones son solo-admin en backend). El
          moderador ve una celda vacía — su única acción es "Dar de alta
          empleado" en la cabecera de la tabla. */}
      <td className="px-4 py-3">
        {!viewerIsAdmin ? (
          <span
            aria-hidden="true"
            className="block text-right text-muted-foreground"
          >
            —
          </span>
        ) : (
          <>
            <div className="flex items-center justify-end gap-1.5">
              {user.banned ? (
                <button
                  className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-50"
                  disabled={pending}
                  onClick={unban}
                  type="button"
                >
                  Desbanear
                </button>
              ) : (
                <button
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
                  disabled={pending}
                  onClick={() => {
                    setDialogError(null);
                    setDialog("ban");
                  }}
                  title="Banear (revoca sus sesiones activas)"
                  type="button"
                >
                  <BanIcon className="size-3.5" />
                  Banear
                </button>
              )}
              <button
                className="inline-flex items-center gap-1 rounded-md border border-danger/40 px-2 py-1 text-xs font-medium text-danger transition hover:bg-danger-soft disabled:opacity-50"
                disabled={pending}
                onClick={() => {
                  setDialogError(null);
                  setDialog("delete");
                }}
                type="button"
              >
                <TrashIcon className="size-3.5" />
                Eliminar
              </button>
            </div>

            {/* Diálogo: banear (con motivo + caducidad opcionales). Se renderiza
            con position:fixed, escapa del flujo de la celda. */}
            <ConfirmDialog
              confirmLabel="Banear usuario"
              description={
                <>
                  Vas a banear a <strong>{user.displayName}</strong>. Better
                  Auth revocará todas sus sesiones activas de inmediato.
                </>
              }
              destructive
              error={dialogError}
              onCancel={() => setDialog(null)}
              onConfirm={confirmBan}
              open={dialog === "ban"}
              pending={pending}
              title="Banear usuario"
            >
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                  Motivo (opcional)
                  <input
                    className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-normal text-foreground outline-none focus:border-brand"
                    maxLength={500}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Spam, conducta inapropiada…"
                    type="text"
                    value={banReason}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-medium text-foreground">
                  Caducidad en días (vacío = permanente)
                  <input
                    className="w-32 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-sm font-normal text-foreground outline-none focus:border-brand"
                    inputMode="numeric"
                    min={1}
                    onChange={(e) => setBanDays(e.target.value)}
                    placeholder="∞"
                    type="number"
                    value={banDays}
                  />
                </label>
              </div>
            </ConfirmDialog>

            {/* Diálogo: eliminar (confirmación fuerte, cascade) */}
            <ConfirmDialog
              confirmLabel="Eliminar definitivamente"
              description={
                <>
                  Vas a <strong>eliminar la cuenta</strong> de{" "}
                  <strong>{user.displayName}</strong> y TODO su contenido
                  (posts, respuestas, reacciones, mensajes…). Esta acción es{" "}
                  <strong>irreversible</strong> y se aplica en cascada.
                </>
              }
              destructive
              error={dialogError}
              onCancel={() => setDialog(null)}
              onConfirm={confirmDelete}
              open={dialog === "delete"}
              pending={pending}
              title="Eliminar cuenta y contenido"
            />
          </>
        )}
      </td>
    </tr>
  );
}
