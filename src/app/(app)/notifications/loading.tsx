// Skeleton de la página de notificaciones mientras el Server Component resuelve.

export default function NotificationsLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando notificaciones…</span>
      <div className="flex items-center justify-between">
        <div className="h-12 w-48 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-9 w-44 animate-pulse rounded-lg bg-surface-muted" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          className="h-16 animate-pulse rounded-xl bg-surface-muted"
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
          key={i}
        />
      ))}
    </div>
  );
}
