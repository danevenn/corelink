"use client";

// Límite de error de la página de perfil. Permite reintentar sin recargar todo.

export default function UserProfileError({
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
        No hemos podido cargar el perfil
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Algo ha fallado al recuperar este perfil. Inténtalo de nuevo.
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
