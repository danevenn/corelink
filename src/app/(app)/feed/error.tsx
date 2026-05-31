"use client";

// Límite de error del feed. Permite reintentar sin recargar toda la app.

export default function FeedError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-12 text-center"
      role="alert"
    >
      <p className="font-medium text-foreground">
        No hemos podido cargar el feed
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Algo ha fallado al recuperar las publicaciones. Inténtalo de nuevo.
      </p>
      <button
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90"
        onClick={reset}
        type="button"
      >
        Reintentar
      </button>
    </div>
  );
}
