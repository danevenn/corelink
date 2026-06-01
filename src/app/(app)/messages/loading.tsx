// Esqueleto del índice de Mensajes mientras carga la lista.
export default function MessagesLoading() {
  return (
    <div className="flex h-[calc(100dvh-7.5rem)] overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="hidden w-80 shrink-0 flex-col border-r border-border md:flex">
        <div className="border-b border-border px-4 py-3">
          <div className="h-5 w-24 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="flex flex-col gap-2 p-2" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              className="flex items-center gap-3 px-3 py-2.5"
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
              key={i}
            >
              <div className="size-10 animate-pulse rounded-full bg-surface-muted" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-surface-muted" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-surface-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden flex-1 items-center justify-center md:flex">
        <div className="size-14 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    </div>
  );
}
