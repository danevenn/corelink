// Esqueleto del hilo mientras carga el historial de la conversación.
export default function ConversationLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col" aria-hidden="true">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="size-10 animate-pulse rounded-full bg-surface-muted" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-32 animate-pulse rounded bg-surface-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {[60, 40, 70, 50].map((w, i) => (
          <div
            className={i % 2 === 0 ? "self-start" : "self-end"}
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
            key={i}
          >
            <div
              className="h-9 animate-pulse rounded-2xl bg-surface-muted"
              style={{ width: `${w * 3}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
