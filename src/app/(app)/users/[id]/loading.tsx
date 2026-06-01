// Skeleton de la página de perfil mientras se resuelven los datos.

export default function UserProfileLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Cargando el perfil…</span>
      <div className="h-56 animate-pulse rounded-2xl bg-surface-muted" />
      <div className="h-5 w-40 animate-pulse rounded-full bg-surface-muted" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          className="h-36 animate-pulse rounded-2xl bg-surface-muted"
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
          key={i}
        />
      ))}
    </div>
  );
}
