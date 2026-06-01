// Skeleton de la página de canal mientras se resuelven los datos.

export default function ChannelLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-5">
      <span className="sr-only">Cargando el canal…</span>
      <div className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
      <div className="h-10 w-72 animate-pulse rounded-full bg-surface-muted" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          className="h-40 animate-pulse rounded-2xl bg-surface-muted"
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
          key={i}
        />
      ))}
    </div>
  );
}
