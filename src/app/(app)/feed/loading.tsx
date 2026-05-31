// Skeleton del feed mientras el Server Component resuelve datos.

export default function FeedLoading() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando el feed…</span>
      <div className="h-12 w-48 animate-pulse rounded-lg bg-surface-muted" />
      <div className="h-32 animate-pulse rounded-2xl bg-surface-muted" />
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
