// Skeleton de la página de búsqueda mientras se resuelven los resultados.

export default function SearchLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">Buscando…</span>
      <div className="h-12 w-64 animate-pulse rounded-lg bg-surface-muted" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            className="h-16 animate-pulse rounded-2xl bg-surface-muted"
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
            key={`u-${i}`}
          />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          className="h-40 animate-pulse rounded-2xl bg-surface-muted"
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
          key={`p-${i}`}
        />
      ))}
    </div>
  );
}
